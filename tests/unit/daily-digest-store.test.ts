import { describe, expect, it, vi } from 'vitest';
import type { Article, DailyDigest } from '@/lib/types';
import { createDailyDigestStore } from '@/store/dailyDigestStore';
import type { StoreMessageClient } from '@/store/message-client';

const article: Article = {
  id: 'a1',
  feedId: 'f1',
  guid: 'g1',
  title: 'Article',
  url: 'https://example.com/article',
  author: '',
  summary: '<p>Summary</p>',
  content: '<p>Article body</p>',
  publishedAt: Date.now(),
  isRead: false,
  isStarred: false,
  tags: [],
  fetchedAt: Date.now(),
};

const digest: DailyDigest = {
  id: 'today',
  dayKey: '2026-07-28',
  timeZone: 'Asia/Shanghai',
  scope: 'all',
  articleIds: ['a1'],
  overview: 'Overview',
  topics: [],
  entries: [{
    articleId: 'a1',
    title: 'Article',
    source: 'Feed',
    publishedAt: article.publishedAt,
    brief: 'Brief',
    whyItMatters: '',
    topics: [],
  }],
  generatedAt: 1,
  model: 'reader-model',
  sourceFingerprint: 'fingerprint',
  promptVersion: 1,
};

describe('daily digest store', () => {
  it('prepares today articles and stores a generated digest', async () => {
    const client = {
      send: vi.fn(async (message: { action: string }) => {
        if (message.action === 'ARTICLE_LIST') return { success: true, data: { articles: [article] } };
        if (message.action === 'DAILY_DIGEST_GET') return { success: true, data: { digest: null } };
        return {
          success: true,
          data: {
            digest,
            cached: false,
            stats: { totalArticles: 1, processedArticles: 1, chunkCount: 1, estimatedRequests: 2 },
          },
        };
      }),
    } as unknown as StoreMessageClient;
    const store = createDailyDigestStore(client);

    await store.getState().prepareTodayDigest(100);
    expect(store.getState().articles).toHaveLength(1);
    expect(store.getState().stats?.estimatedRequests).toBe(2);

    await store.getState().generateTodayDigest(100);
    expect(store.getState().digest).toEqual(digest);
    expect(client.send).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DAILY_DIGEST_GENERATE',
      payload: expect.objectContaining({
        scope: 'all',
        articleExcerpts: [{ articleId: 'a1', textExcerpt: 'Summary\n\nArticle body' }],
      }),
    }));
  });
});
