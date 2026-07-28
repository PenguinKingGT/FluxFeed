import { describe, expect, it, vi } from 'vitest';
import type { Feed } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { AiRequestError } from '@/lib/ai';
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
    saveArticles: vi.fn(),
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
    expect(storageService.saveArticles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        guid: 'article-1',
        fetchedAt: 2000,
      }),
    ]);
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
    expect(storageService.saveArticles).not.toHaveBeenCalled();
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
    const refreshSingleFeed = vi.fn().mockResolvedValue(2);

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

    expect(response).toEqual({ success: true, data: { count: 2 } });
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

  it('generates and saves a manual article summary through injected AI dependencies', async () => {
    const storageService = createStorageService();
    storageService.getArticle.mockResolvedValue({
      id: 'a1',
      title: 'Article',
      author: 'Author',
    });
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
      },
    });
    const complete = vi.fn().mockResolvedValue('{"overview":"Summary","keyPoints":["Point"]}');

    const response = await handleBackgroundMessage(
      {
        action: 'ARTICLE_SUMMARIZE',
        payload: {
          articleId: 'a1',
          contentText: 'A'.repeat(100),
          trigger: 'manual',
        },
      },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn().mockResolvedValue('key'),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient: vi.fn(() => ({ complete })),
        now: () => 100,
      },
    );

    expect(response.success).toBe(true);
    expect(storageService.updateArticle).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        aiSummary: expect.objectContaining({ overview: 'Summary', model: 'reader-model' }),
      }),
    );
  });

  it('enforces the automatic summary character threshold in the background', async () => {
    const storageService = createStorageService();
    storageService.getArticle.mockResolvedValue({ id: 'a1', title: 'Article' });
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
        autoSummarizeOnOpen: true,
        autoSummarizeMinCharacters: 500,
      },
    });
    const createAiClient = vi.fn();

    const response = await handleBackgroundMessage(
      {
        action: 'ARTICLE_SUMMARIZE',
        payload: {
          articleId: 'a1',
          contentText: 'A'.repeat(100),
          trigger: 'auto',
        },
      },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn(),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient,
      },
    );

    expect(response).toEqual({ success: false, error: 'AI_AUTO_SUMMARY_BELOW_THRESHOLD' });
    expect(createAiClient).not.toHaveBeenCalled();
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
    const refreshAllFeeds = vi.fn().mockResolvedValue(7);
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

    expect(response).toEqual({ success: true, data: { count: 7 } });
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

  it('reads a cached daily digest and rejects an invalid day range', async () => {
    const storageService = createStorageService();
    const digest = { id: '2026-07-28:Asia%2FShanghai:all', overview: 'Overview' };
    storageService.getDailyDigest.mockResolvedValue(digest);
    const dependencies = {
      storageService,
      fetchFeed: vi.fn(),
      updateBadge: vi.fn(),
      refreshSingleFeed: vi.fn(),
      refreshAllFeeds: vi.fn(),
    };
    const validPayload = {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all' as const,
      startAt: 1000,
      endAt: 2000,
    };

    const valid = await handleBackgroundMessage(
      { action: 'DAILY_DIGEST_GET', payload: validPayload },
      dependencies,
    );
    const invalid = await handleBackgroundMessage(
      {
        action: 'DAILY_DIGEST_GET',
        payload: { ...validPayload, dayKey: '07/28/2026', endAt: validPayload.startAt },
      },
      dependencies,
    );

    expect(valid).toEqual({ success: true, data: { digest } });
    expect(storageService.getDailyDigest).toHaveBeenCalledWith(
      '2026-07-28:Asia%2FShanghai:all',
    );
    expect(invalid).toEqual({ success: false, error: 'DAILY_DIGEST_INVALID_DATE' });
  });

  it('generates and saves a daily digest through injected AI dependencies', async () => {
    const storageService = createStorageService();
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
      },
    });
    storageService.getArticles.mockResolvedValue([{
      id: 'a1',
      feedId: 'feed-1',
      title: 'Article',
      author: 'Author',
      publishedAt: 1500,
      summary: 'Fallback summary',
      isRead: false,
    }]);
    storageService.getFeeds.mockResolvedValue([{ id: 'feed-1', title: 'Feed' }]);
    storageService.getDailyDigest.mockResolvedValue(undefined);
    const complete = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({
        entries: [{
          articleId: 'a1',
          brief: 'Generated brief',
          whyItMatters: 'Useful',
          topics: ['AI'],
        }],
        topicHints: ['AI'],
      }))
      .mockResolvedValueOnce(JSON.stringify({
        overview: 'Today overview',
        topics: [{ name: 'AI', overview: 'AI news', articleIds: ['a1'] }],
      }));

    const response = await handleBackgroundMessage(
      {
        action: 'DAILY_DIGEST_GENERATE',
        payload: {
          dayKey: '2026-07-28',
          timeZone: 'Asia/Shanghai',
          scope: 'all',
          startAt: 1000,
          endAt: 2000,
          articleExcerpts: [{ articleId: 'a1', textExcerpt: 'Article body' }],
        },
      },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn().mockResolvedValue('key'),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient: vi.fn(() => ({ complete })),
        now: () => 3000,
      },
    );

    expect(response.success).toBe(true);
    expect(storageService.saveDailyDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '2026-07-28:Asia%2FShanghai:all',
        overview: 'Today overview',
        articleIds: ['a1'],
      }),
    );
  });

  it('updates AI credentials without returning the secret', async () => {
    const storageService = createStorageService();
    const aiSecretStorage = {
      hasApiKey: vi.fn().mockResolvedValue(true),
      getApiKey: vi.fn(),
      setApiKey: vi.fn(),
      clearApiKey: vi.fn(),
    };
    const dependencies = {
      storageService,
      fetchFeed: vi.fn(),
      updateBadge: vi.fn(),
      refreshSingleFeed: vi.fn(),
      refreshAllFeeds: vi.fn(),
      aiSecretStorage,
    };

    const update = await handleBackgroundMessage(
      { action: 'AI_CREDENTIAL_UPDATE', payload: { apiKey: 'private-key' } },
      dependencies,
    );
    const status = await handleBackgroundMessage(
      { action: 'AI_CREDENTIAL_STATUS' },
      dependencies,
    );

    expect(aiSecretStorage.setApiKey).toHaveBeenCalledWith('private-key');
    expect(update).toEqual({ success: true, data: { hasApiKey: true } });
    expect(status).toEqual({ success: true, data: { hasApiKey: true } });
    expect(JSON.stringify([update, status])).not.toContain('private-key');
  });

  it('rejects oversized AI credentials', async () => {
    const storageService = createStorageService();
    const setApiKey = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'AI_CREDENTIAL_UPDATE', payload: { apiKey: 'x'.repeat(10001) } },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn(),
          setApiKey,
          clearApiKey: vi.fn(),
        },
      },
    );

    expect(response).toEqual({ success: false, error: 'AI_REQUEST_INVALID' });
    expect(setApiKey).not.toHaveBeenCalled();
  });

  it('maps AI connection failures to their public error code', async () => {
    const storageService = createStorageService();
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
      },
    });

    const response = await handleBackgroundMessage(
      { action: 'AI_CONNECTION_TEST' },
      {
        storageService,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn().mockResolvedValue('key'),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient: vi.fn(() => ({
          complete: vi.fn().mockRejectedValue(new AiRequestError('AI_TIMEOUT')),
        })),
      },
    );

    expect(response).toEqual({ success: false, error: 'AI_TIMEOUT' });
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
