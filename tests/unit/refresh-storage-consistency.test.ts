import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSingleFeed } from '@/entrypoints/background/refresh-feeds';
import { FluxFeedDatabase } from '@/lib/db/database';
import { resetDatabase } from '@/lib/db/database-service';
import { createStorageService } from '@/lib/db/storage-service';
import type { FetchFeedResult } from '@/lib/feed';
import type { Feed } from '@/lib/types';

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

const response: FetchFeedResult = {
  success: true,
  feed: {
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
  },
};

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

  it('also discards a refresh deleted after GUID lookup but before commit', async () => {
    await storageService.saveFeed(feed);
    const count = await refreshSingleFeed(feed, {
      storageService: {
        ...storageService,
        /** Deletes at the final commit boundary, after an earlier existence check would pass. */
        async getArticleGuids(feedId) {
          const guids = await storageService.getArticleGuids(feedId);
          await storageService.removeFeed(feedId);
          return guids;
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
});
