import { describe, expect, it, vi } from 'vitest';
import type { Feed } from '@/lib/types';
import {
  REFRESH_CONCURRENCY,
  refreshAllFeeds,
  refreshSingleFeed,
} from '@/entrypoints/background/refresh-feeds';

function createFeed(patch: Partial<Feed> = {}): Feed {
  return {
    id: 'feed-1',
    url: 'https://example.com/feed.xml',
    title: 'Old Feed',
    description: '',
    siteUrl: 'https://example.com',
    iconUrl: '',
    refreshInterval: 30,
    errorCount: 1,
    createdAt: 1000,
    ...patch,
  };
}

describe('background refresh feeds', () => {
  it('saves only new articles and resets feed error state after success', async () => {
    const feed = createFeed();
    const storageService = {
      getFeeds: vi.fn(),
      getArticles: vi.fn().mockResolvedValue([{ id: 'legacy-article-id', guid: 'old-guid' }]),
      saveArticles: vi.fn(),
      updateFeed: vi.fn(),
    };
    const fetchFeed = vi.fn().mockResolvedValue({
      success: true,
      feed: {
        title: 'Fresh Feed',
        description: '',
        siteUrl: 'https://example.com',
        iconUrl: 'https://example.com/icon.png',
        articles: [
          {
            guid: 'old-guid',
            title: 'Old Article',
            summary: '',
            content: '',
            author: '',
            publishedAt: 2000,
            url: 'https://example.com/old',
          },
          {
            guid: 'new-guid',
            title: 'New Article',
            summary: 'Summary',
            content: '<p>Content</p>',
            author: 'Author',
            publishedAt: 3000,
            url: 'https://example.com/new',
          },
        ],
      },
    });

    const savedCount = await refreshSingleFeed(feed, {
      storageService,
      fetchFeed,
      now: () => 4000,
    });

    expect(savedCount).toBe(1);
    expect(fetchFeed).toHaveBeenCalledWith(feed.url);
    expect(storageService.saveArticles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        feedId: 'feed-1',
        guid: 'new-guid',
        isRead: false,
        isStarred: false,
        fetchedAt: 4000,
      }),
    ]);
    expect(storageService.updateFeed).toHaveBeenCalledWith('feed-1', {
      title: 'Fresh Feed',
      iconUrl: 'https://example.com/icon.png',
      lastFetchedAt: 4000,
      errorCount: 0,
    });
  });

  it('increments feed error count when fetch fails', async () => {
    const feed = createFeed({ errorCount: 2 });
    const storageService = {
      getFeeds: vi.fn(),
      getArticles: vi.fn(),
      saveArticles: vi.fn(),
      updateFeed: vi.fn(),
    };
    const fetchFeed = vi.fn().mockResolvedValue({ success: false, error: 'network' });

    const savedCount = await refreshSingleFeed(feed, { storageService, fetchFeed });

    expect(savedCount).toBe(0);
    expect(storageService.saveArticles).not.toHaveBeenCalled();
    expect(storageService.updateFeed).toHaveBeenCalledWith('feed-1', { errorCount: 3 });
  });

  it('refreshes all feeds and returns the total new article count', async () => {
    const feeds = [createFeed({ id: 'feed-1' }), createFeed({ id: 'feed-2', url: 'https://example.org/rss' })];
    const storageService = {
      getFeeds: vi.fn().mockResolvedValue(feeds),
      getArticles: vi.fn().mockResolvedValue([]),
      saveArticles: vi.fn(),
      updateFeed: vi.fn(),
    };
    const fetchFeed = vi.fn().mockResolvedValue({
      success: true,
      feed: {
        title: 'Feed',
        description: '',
        siteUrl: '',
        iconUrl: '',
        articles: [
          {
            guid: 'article',
            title: 'Article',
            summary: '',
            content: '',
            author: '',
            publishedAt: 1000,
            url: 'https://example.com/article',
          },
        ],
      },
    });

    const total = await refreshAllFeeds({ storageService, fetchFeed, now: () => 5000 });

    expect(total).toBe(2);
    expect(fetchFeed).toHaveBeenCalledTimes(2);
  });

  it('limits simultaneous feed requests to the configured concurrency', async () => {
    const feeds = Array.from({ length: 12 }, (_, index) =>
      createFeed({ id: `feed-${index}`, url: `https://example.com/${index}.xml` }),
    );
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const storageService = {
      getFeeds: vi.fn().mockResolvedValue(feeds),
      getArticles: vi.fn(),
      saveArticles: vi.fn(),
      updateFeed: vi.fn(),
    };
    const fetchFeed = vi.fn().mockImplementation(async () => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeRequests -= 1;
      return { success: false, error: 'network' };
    });

    await refreshAllFeeds({ storageService, fetchFeed });

    expect(maximumActiveRequests).toBe(REFRESH_CONCURRENCY);
  });
});
