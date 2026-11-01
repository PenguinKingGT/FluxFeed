import { describe, expect, it, vi } from 'vitest';
import type { Feed } from '@/lib/types';
import { handleBackgroundMessage } from '@/entrypoints/background/message-handler';

function createStorageService() {
  return {
    saveFeed: vi.fn(),
    removeFeed: vi.fn(),
    getFeed: vi.fn(),
    getFeeds: vi.fn(),
    getGroups: vi.fn(),
    saveGroup: vi.fn(),
    removeGroup: vi.fn(),
    moveTreeNode: vi.fn(),
    getUnreadCount: vi.fn().mockResolvedValue(3),
    getSettings: vi.fn(),
    commitFeedRefresh: vi.fn(),
    bulkUpdateArticles: vi.fn(),
    getArticles: vi.fn(),
    updateArticle: vi.fn(),
    saveSettings: vi.fn(),
    getArticle: vi.fn(),
    getDailyDigest: vi.fn(),
    saveDailyDigest: vi.fn(),
  };
}

describe('background message handler', () => {
  it('adds a feed from a fetched URL and stores parsed articles', async () => {
    const storageService = createStorageService();
    storageService.getFeeds.mockResolvedValue([]);
    const fetchFeed = vi.fn().mockResolvedValue({
      success: true,
      resolvedUrl: 'https://example.com/rss.xml',
      feed: {
        title: 'Example Feed',
        description: 'Feed description',
        siteUrl: 'https://example.com',
        iconUrl: '',
        articles: [
          {
            guid: 'article-1',
            title: 'Article 1',
            summary: '',
            content: '',
            author: '',
            publishedAt: 1000,
            url: 'https://example.com/1',
          },
        ],
      },
    });
    const updateBadge = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'FEED_ADD', payload: { url: 'https://example.com/rss.xml', groupId: 'group-1' } },
      {
        storageService,
        fetchFeed,
        updateBadge,
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        now: () => 2000,
      },
    );

    expect(response.success).toBe(true);
    expect(storageService.saveFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        title: 'Example Feed',
        url: 'https://example.com/rss.xml',
        groupId: 'group-1',
      }),
    );
    expect(storageService.commitFeedRefresh).toHaveBeenCalledWith(expect.any(String), [
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        guid: 'article-1',
        fetchedAt: 2000,
      }),
    ], {
      title: 'Example Feed',
      iconUrl: '',
      lastFetchedAt: 2000,
      errorCount: 0,
    });
    expect(updateBadge).toHaveBeenCalled();
  });

  it('returns an existing feed without duplicating it', async () => {
    const storageService = createStorageService();
    storageService.getFeeds.mockResolvedValue([
      { id: 'feed-1', url: 'https://example.com/rss.xml', title: 'RSS' },
    ]);
    const fetchFeed = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'FEED_ADD', payload: { url: 'https://example.com/rss.xml' } },
      {
        storageService,
        fetchFeed,
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        now: () => 2000,
      },
    );

    expect(response).toEqual({
      success: true,
      data: { feed: { id: 'feed-1', url: 'https://example.com/rss.xml', title: 'RSS' }, duplicate: true },
    });
    expect(fetchFeed).not.toHaveBeenCalled();
    expect(storageService.saveFeed).not.toHaveBeenCalled();
    expect(storageService.commitFeedRefresh).not.toHaveBeenCalled();
  });

  it('marks selected articles as read and updates the badge', async () => {
    const storageService = createStorageService();
    const updateBadge = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'ARTICLE_MARK_READ', payload: { articleIds: ['a1', 'a2'] } },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge,
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(response.success).toBe(true);
    expect(storageService.bulkUpdateArticles).toHaveBeenCalledWith(['a1', 'a2'], { isRead: true });
    expect(updateBadge).toHaveBeenCalled();
  });

  it('refreshes one feed when a feed id is provided', async () => {
    const feed = { id: 'feed-1' } as Feed;
    const storageService = createStorageService();
    storageService.getFeed.mockResolvedValue(feed);
    const refreshSingleFeed = vi.fn().mockResolvedValue({ count: 2, failedCount: 0 });

    const response = await handleBackgroundMessage(
      { action: 'FEED_REFRESH', payload: { feedId: 'feed-1' } },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed,
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(response).toEqual({ success: true, data: { count: 2, failedCount: 0 } });
    expect(refreshSingleFeed).toHaveBeenCalledWith(feed);
  });

  it('returns unread count for popup badge display', async () => {
    const storageService = createStorageService();

    const response = await handleBackgroundMessage(
      { action: 'GET_UNREAD_COUNT' },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(response).toEqual({ success: true, data: { count: 3 } });
  });

  it('returns feeds for popup subscribed-state checks', async () => {
    const storageService = createStorageService();
    storageService.getFeeds = vi.fn().mockResolvedValue([
      { id: 'feed-1', url: 'https://example.com/feed.xml', title: 'RSS' },
    ]);

    const response = await handleBackgroundMessage(
      { action: 'FEED_LIST' },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(response).toEqual({
      success: true,
      data: {
        feeds: [{ id: 'feed-1', url: 'https://example.com/feed.xml', title: 'RSS' }],
      },
    });
  });



  it('deletes a feed and updates the badge', async () => {
    const storageService = createStorageService();
    const updateBadge = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'FEED_DELETE', payload: { feedId: 'feed-1' } },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge,
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(storageService.removeFeed).toHaveBeenCalledWith('feed-1');
    expect(updateBadge).toHaveBeenCalledOnce();
    expect(response).toEqual({ success: true });
  });

  it('refreshes all feeds and reports the refreshed article count', async () => {
    const storageService = createStorageService();
    const refreshAllFeeds = vi.fn().mockResolvedValue({ count: 7, failedCount: 0 });
    const updateBadge = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'FEED_REFRESH_ALL' },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge,
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds,
      },
    );

    expect(response).toEqual({ success: true, data: { count: 7, failedCount: 0 } });
    expect(refreshAllFeeds).toHaveBeenCalledOnce();
    expect(updateBadge).toHaveBeenCalledOnce();
  });

  it('marks every unread article in a feed as read', async () => {
    const storageService = createStorageService();
    storageService.getArticles.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);

    const response = await handleBackgroundMessage(
      { action: 'ARTICLE_MARK_ALL_READ', payload: { feedId: 'feed-1' } },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(storageService.getArticles).toHaveBeenCalledWith({
      feedId: 'feed-1',
      onlyUnread: true,
    });
    expect(storageService.bulkUpdateArticles).toHaveBeenCalledWith(
      ['a1', 'a2'],
      { isRead: true },
    );
    expect(response).toEqual({ success: true });
  });

  it('stars and unstars an article with a deterministic timestamp', async () => {
    const storageService = createStorageService();
    const dependencies = {
      storageService,
      fetchFeed: vi.fn(),
      updateBadge: vi.fn(),
      refreshSingleFeed: vi.fn(),
      refreshAllFeeds: vi.fn(),
      now: () => 1234,
    };

    const starred = await handleBackgroundMessage(
      { action: 'ARTICLE_STAR', payload: { articleId: 'a1', starred: true } },
      dependencies,
    );
    const unstarred = await handleBackgroundMessage(
      { action: 'ARTICLE_STAR', payload: { articleId: 'a1', starred: false } },
      dependencies,
    );

    expect(storageService.updateArticle).toHaveBeenNthCalledWith(1, 'a1', {
      isStarred: true,
      starredAt: 1234,
    });
    expect(storageService.updateArticle).toHaveBeenNthCalledWith(2, 'a1', {
      isStarred: false,
      starredAt: undefined,
    });
    expect(starred).toEqual({ success: true });
    expect(unstarred).toEqual({ success: true });
  });






  it('converts unexpected background dependency rejection into a failure response', async () => {
    const storageService = createStorageService();
    storageService.removeFeed.mockRejectedValue(new Error('Database unavailable'));

    const response = await handleBackgroundMessage(
      { action: 'FEED_DELETE', payload: { feedId: 'feed-1' } },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
      },
    );

    expect(response).toEqual({ success: false, error: 'Database unavailable' });
  });
});


describe('AI operation routing', () => {
  it.each([
    'ARTICLE_SUMMARIZE', 'DAILY_DIGEST_GET', 'DAILY_DIGEST_GENERATE',
    'AI_CREDENTIAL_STATUS', 'AI_CREDENTIAL_UPDATE', 'AI_CONNECTION_TEST',
  ] as const)('delegates %s without interpreting AI inputs', async (action) => {
    const payload = { opaque: true };
    const result = { success: true, data: { cached: true } };
    const execute = vi.fn().mockResolvedValue(result);
    const response = await handleBackgroundMessage({ action, payload }, {
      storageService: createStorageService(),
      fetchFeed: vi.fn(),
      updateBadge: vi.fn(),
      refreshSingleFeed: vi.fn(),
      refreshAllFeeds: vi.fn(),
      ai: { execute },
    });
    expect(execute).toHaveBeenCalledWith({ action, payload });
    expect(response).toEqual(result);
  });

  it('reports partial refresh failure while preserving committed additions and updating the badge', async () => {
    const updateBadge = vi.fn();
    const response = await handleBackgroundMessage(
      { action: 'FEED_REFRESH_ALL' },
      {
        storageService: createStorageService(),
        fetchFeed: vi.fn(), updateBadge,
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn().mockResolvedValue({ count: 3, failedCount: 1 }),
      },
    );
    expect(response).toEqual({
      success: false, error: 'FEED_REFRESH_FAILED', data: { count: 3, failedCount: 1 },
    });
    expect(updateBadge).toHaveBeenCalledOnce();
  });

});
