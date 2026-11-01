import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSingleFeed } from '@/entrypoints/background/refresh-feeds';
import { handleBackgroundMessage } from '@/entrypoints/background/message-handler';
import { FluxFeedDatabase } from '@/lib/db/database';
import { resetDatabase } from '@/lib/db/database-service';
import { createStorageService } from '@/lib/db/storage-service';
import type { FetchFeedResult } from '@/lib/feed';
import type { Article, Feed, ParsedFeed } from '@/lib/types';

const feed: Feed = {
  id: 'pending-feed',
  url: 'https://example.com/feed.xml',
  title: 'Before refresh',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  groupId: 'pending-group',
  refreshInterval: 60,
  errorCount: 0,
  createdAt: 1,
};

const parsedFeed: ParsedFeed = {
  title: 'After refresh',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  articles: [{
    guid: 'new-article',
    title: 'Late article',
    url: 'https://example.com/article',
    author: '',
    summary: '',
    content: '<p>Late response</p>',
    publishedAt: 1,
  }],
};

const response: FetchFeedResult = { success: true, feed: parsedFeed };

describe('refresh storage consistency', () => {
  const database = new FluxFeedDatabase();
  const storageService = createStorageService(database);

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetDatabase(database);
  });

  it.each(['feed', 'folder'])('discards a late response after deleting its %s', async (target) => {
    await storageService.saveGroup({ id: 'pending-group', name: 'Pending', order: 0, createdAt: 1 });
    await storageService.saveFeed(feed);
    let finishFetch: ((result: FetchFeedResult) => void) | undefined;
    const refreshing = refreshSingleFeed(feed, {
      storageService,
      fetchFeed: () => new Promise<FetchFeedResult>((resolve) => {
        finishFetch = resolve;
      }),
    });

    if (target === 'feed') {
      await storageService.removeFeed(feed.id);
    } else {
      await storageService.removeGroup('pending-group');
    }
    if (!finishFetch) {
      throw new Error('Refresh did not start its request');
    }
    finishFetch(response);

    expect(await refreshing).toBe(0);
    expect(await storageService.getFeed(feed.id)).toBeUndefined();
    expect(await storageService.getArticles()).toEqual([]);
    expect(await storageService.getUnreadCount()).toBe(0);
  });

  it('also discards a refresh deleted just before its commit', async () => {
    await storageService.saveFeed(feed);
    const count = await refreshSingleFeed(feed, {
      storageService: {
        ...storageService,
        /** Deletes at the final commit boundary, after an earlier existence check would pass. */
        async commitFeedRefresh(feedId, articles, patch) {
          await storageService.removeFeed(feedId);
          return storageService.commitFeedRefresh(feedId, articles, patch);
        },
      },
      fetchFeed: async () => response,
    });

    expect(count).toBe(0);
    expect(await storageService.getArticles()).toEqual([]);
    expect(await storageService.getUnreadCount()).toBe(0);
  });

  it('saves normal refreshes and lets a later deletion remove the committed articles', async () => {
    await storageService.saveFeed(feed);

    const count = await refreshSingleFeed(feed, {
      storageService,
      fetchFeed: async () => response,
      now: () => 500,
    });

    expect(count).toBe(1);
    expect(await storageService.getFeed(feed.id)).toMatchObject({
      title: 'After refresh',
      lastFetchedAt: 500,
      errorCount: 0,
    });
    expect(await storageService.getUnreadCount()).toBe(1);

    await storageService.removeFeed(feed.id);

    expect(await storageService.getArticles()).toEqual([]);
    expect(await storageService.getUnreadCount()).toBe(0);
  });

  it('rolls back article inserts when the feed metadata update fails', async () => {
    await storageService.saveFeed(feed);
    vi.spyOn(database.feeds, 'update').mockRejectedValueOnce(new Error('Metadata write failed'));

    await expect(refreshSingleFeed(feed, {
      storageService,
      fetchFeed: async () => response,
    })).rejects.toThrow('Metadata write failed');

    expect(await storageService.getArticles()).toEqual([]);
    expect(await storageService.getFeed(feed.id)).toEqual(feed);
  });

  it.each(['same service', 'separate connection'])('deduplicates overlapping refreshes from %s', async (mode) => {
    await storageService.saveFeed(feed);
    const peerDatabase = new FluxFeedDatabase();
    const peerStorage = mode === 'same service' ? storageService : createStorageService(peerDatabase);
    let arrivals = 0;
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });

    /** Forces both refreshes to finish preparing candidates before either starts its commit. */
    function dependencies(storage: typeof storageService) {
      return {
        storageService: {
          ...storage,
          async commitFeedRefresh(...args: Parameters<typeof storage.commitFeedRefresh>) {
            arrivals += 1;
            if (arrivals === 2) {
              release();
            }
            await ready;
            return storage.commitFeedRefresh(...args);
          },
        },
        fetchFeed: async () => response,
      };
    }

    try {
      const counts = await Promise.all([
        refreshSingleFeed(feed, dependencies(storageService)),
        refreshSingleFeed(feed, dependencies(peerStorage)),
      ]);

      expect(counts.sort()).toEqual([0, 1]);
      expect(await storageService.getArticles()).toHaveLength(1);
      expect(await storageService.getUnreadCount()).toBe(1);
    } finally {
      peerDatabase.close();
    }
  });

  it('keeps the first article when one response repeats a new GUID', async () => {
    await storageService.saveFeed(feed);
    const count = await refreshSingleFeed(feed, {
      storageService,
      fetchFeed: async () => ({
        success: true,
        feed: {
          ...parsedFeed,
          articles: [parsedFeed.articles[0], { ...parsedFeed.articles[0], title: 'Duplicate entry' }],
        },
      }),
    });

    expect(count).toBe(1);
    expect(await storageService.getArticles()).toMatchObject([{ title: 'Late article' }]);
    expect(await storageService.getUnreadCount()).toBe(1);
  });

  it('retains stored article identity and reading state across repeated refreshes', async () => {
    await storageService.saveFeed(feed);
    const dependencies = { storageService, fetchFeed: async () => response };
    await refreshSingleFeed(feed, dependencies);
    const [article] = await storageService.getArticles();
    await storageService.updateArticle(article.id, { isRead: true, isStarred: true });
    const before = await storageService.getArticles();
    const readBody = vi.fn((stored: Article) => stored);
    database.articles.hook('reading', readBody);

    try {
      expect(await refreshSingleFeed(feed, dependencies)).toBe(0);
      expect(readBody).not.toHaveBeenCalled();
    } finally {
      database.articles.hook('reading').unsubscribe(readBody);
    }
    expect(await storageService.getArticles()).toEqual(before);
    expect(await storageService.getUnreadCount()).toBe(0);
  });

  it('allows the same GUID in two different feeds', async () => {
    const otherFeed = { ...feed, id: 'other-feed', url: 'https://other.example.com/feed.xml' };
    await storageService.saveFeed(feed);
    await storageService.saveFeed(otherFeed);

    const counts = await Promise.all([
      refreshSingleFeed(feed, { storageService, fetchFeed: async () => response }),
      refreshSingleFeed(otherFeed, { storageService, fetchFeed: async () => response }),
    ]);

    expect(counts).toEqual([1, 1]);
    expect(await storageService.getArticleGuids(feed.id)).toEqual(['new-article']);
    expect(await storageService.getArticleGuids(otherFeed.id)).toEqual(['new-article']);
  });

  it('also deduplicates repeated GUIDs on initial subscription', async () => {
    const result = await handleBackgroundMessage({
      action: 'FEED_ADD',
      payload: { url: feed.url },
    }, {
      storageService,
      fetchFeed: async () => ({
        success: true,
        feed: { ...parsedFeed, articles: [parsedFeed.articles[0], parsedFeed.articles[0]] },
      }),
      updateBadge: async () => {},
      refreshSingleFeed: vi.fn(),
      refreshAllFeeds: vi.fn(),
    });

    expect(result.success).toBe(true);
    expect(await storageService.getArticles()).toHaveLength(1);
    expect(await storageService.getUnreadCount()).toBe(1);
  });
});
