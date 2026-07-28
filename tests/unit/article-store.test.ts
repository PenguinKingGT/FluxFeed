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
});
