import { ARTICLE_MAX_CHARACTERS } from '@/lib/ai/article-chunker';
import { describe, expect, it, vi } from 'vitest';
import type { Article } from '@/lib/types';
import { createArticleStore } from '@/store/articleStore';

function article(id: string): Article {
  return {
    id,
    feedId: 'feed-1',
    guid: id,
    title: `Article ${id}`,
    url: `https://example.com/${id}`,
    author: '',
    summary: `Summary ${id}`,
    content: '',
    publishedAt: 1000,
    isRead: false,
    isStarred: false,
    tags: [],
    fetchedAt: 1000,
  };
}

describe('article store', () => {
  it.each(['inbox', 'all', 'starred', 'folder'] as const)(
    'clears the old feed scope when switching to %s',
    async (view) => {
      const first = { ...article('a1'), feedId: 'feed-1', isStarred: true };
      const second = { ...article('a2'), feedId: 'feed-2', isStarred: true };
      const client = {
        send: vi.fn().mockImplementation(async (message: { payload?: { feedId?: string } }) => ({
          success: true,
          data: {
            articles: [first, second].filter((item) =>
              !message.payload?.feedId || item.feedId === message.payload.feedId,
            ),
          },
        })),
      };
      const store = createArticleStore(client);
      await store.getState().loadArticles({ view: 'feed', feedId: 'feed-1', showUnreadOnly: false });
      expect(store.getState().articles.map((item) => item.id)).toEqual(['a1']);
      await store.getState().loadArticles({
        view,
        folder: view === 'folder' ? 'group-1' : undefined,
        showUnreadOnly: true,
      });
      expect(store.getState().articles.map((item) => item.id)).toEqual(['a1', 'a2']);
      expect(store.getState().filter.feedId).toBeUndefined();
    },
  );

  it.each([true, false])('ignores an obsolete feed reply (success=%s) after loading the inbox', async (success) => {
    const first = article('a1');
    const second = { ...article('a2'), feedId: 'feed-2' };
    let finishFeed: (result: unknown) => void = () => {};
    const client = {
      send: vi.fn()
        .mockReturnValueOnce(new Promise((resolve) => {
          finishFeed = resolve;
        }))
        .mockResolvedValueOnce({ success: true, data: { articles: [first, second] } }),
    };
    const store = createArticleStore(client);
    const pending = store.getState().loadArticles({ view: 'feed', feedId: 'feed-1' });
    await store.getState().loadArticles({ view: 'inbox' });
    finishFeed(success
      ? { success: true, data: { articles: [first] } }
      : { success: false, error: 'Old feed request failed' });
    await pending;
    expect(store.getState().articles.map((item) => item.id)).toEqual(['a1', 'a2']);
    expect(store.getState().filter.view).toBe('inbox');
    expect(store.getState().error).toBeNull();
    expect(store.getState().isLoading).toBe(false);
  });

  it('retains the current feed when searching or refreshing within its view', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true, data: { articles: [article('a1')] } }) };
    const store = createArticleStore(client);
    await store.getState().loadArticles({ view: 'feed', feedId: 'feed-1' });
    await store.getState().loadArticles({ searchQuery: 'Summary' });
    expect(store.getState().filter.feedId).toBe('feed-1');
    expect(store.getState().articles).toHaveLength(1);
    expect(client.send).toHaveBeenLastCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ feedId: 'feed-1' }),
    }));
  });

  it('loads inbox articles with unread filter', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({ success: true, data: { articles: [article('a1')] } }),
    };
    const store = createArticleStore(client);

    await store.getState().loadArticles({ view: 'inbox', showUnreadOnly: true });

    expect(client.send).toHaveBeenCalledWith({
      action: 'ARTICLE_LIST',
      payload: { feedId: undefined, groupId: undefined, onlyUnread: true, onlyStarred: false },
    });
    expect(store.getState().articles).toHaveLength(1);
  });

  it('loads folder articles with group id filter', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({ success: true, data: { articles: [article('a1')] } }),
    };
    const store = createArticleStore(client);

    await store.getState().loadArticles({ view: 'folder', folder: 'group-1', showUnreadOnly: true });

    expect(client.send).toHaveBeenCalledWith({
      action: 'ARTICLE_LIST',
      payload: { feedId: undefined, groupId: 'group-1', onlyUnread: false, onlyStarred: false },
    });
  });

  it('loads unread count independently from current article list', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({ success: true, data: { count: 7 } }),
    };
    const store = createArticleStore(client);

    await store.getState().loadUnreadCount();

    expect(client.send).toHaveBeenCalledWith({ action: 'GET_UNREAD_COUNT' });
    expect(store.getState().unreadCount).toBe(7);
  });

  it('refreshes unread count after marking an article read', async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, data: { count: 3 } }),
    };
    const store = createArticleStore(client);
    store.setState({ articles: [article('a1')], unreadCount: 4 });

    await store.getState().markRead('a1');

    expect(client.send).toHaveBeenCalledWith({ type: 'MARK_READ', articleIds: ['a1'] });
    expect(client.send).toHaveBeenCalledWith({ action: 'GET_UNREAD_COUNT' });
    expect(store.getState().unreadCount).toBe(3);
  });

  it('moves active article to next and previous article', () => {
    const store = createArticleStore({ send: vi.fn() });
    store.setState({ articles: [article('a1'), article('a2')], activeArticleId: 'a1' });

    store.getState().goNext();
    expect(store.getState().activeArticleId).toBe('a2');

    store.getState().goPrev();
    expect(store.getState().activeArticleId).toBe('a1');
  });

  it('marks selected article as read locally after background update', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createArticleStore(client);
    store.setState({ articles: [article('a1')] });

    await store.getState().markRead('a1');

    expect(client.send).toHaveBeenCalledWith({ type: 'MARK_READ', articleIds: ['a1'] });
    expect(store.getState().articles[0].isRead).toBe(true);
  });

  it('deduplicates automatic summary attempts and stores the returned summary', async () => {
    const summary = {
      overview: 'Summary',
      keyPoints: ['Point'],
      generatedAt: 1,
      model: 'reader-model',
      sourceFingerprint: 'fingerprint',
      promptVersion: 1 as const,
    };
    const client = {
      send: vi.fn().mockResolvedValue({ success: true, data: { summary, cached: false, stale: false } }),
    };
    const store = createArticleStore(client);
    store.setState({ articles: [article('a1')] });

    await store.getState().summarizeArticle('a1', 'A'.repeat(100), { trigger: 'auto' });
    await store.getState().summarizeArticle('a1', 'A'.repeat(100), { trigger: 'auto' });

    expect(client.send).toHaveBeenCalledTimes(1);
    expect(store.getState().articles[0].aiSummary).toEqual(summary);
    expect(store.getState().summaryStatusByArticleId.a1).toBe('success');
  });

  it('bounds summary messages while retaining partial consent and an overflow sentinel', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: false, error: 'AI_TIMEOUT' }) };
    const store = createArticleStore(client);
    await store.getState().summarizeArticle('a1', 'A'.repeat(ARTICLE_MAX_CHARACTERS * 2), {
      trigger: 'manual', allowPartial: true,
    });
    expect(client.send).toHaveBeenCalledWith({
      action: 'ARTICLE_SUMMARIZE',
      payload: {
        articleId: 'a1', contentText: 'A'.repeat(ARTICLE_MAX_CHARACTERS + 1),
        trigger: 'manual', allowPartial: true, force: undefined,
      },
    });
    expect(store.getState().summaryStatusByArticleId.a1).toBe('error');
  });

});
