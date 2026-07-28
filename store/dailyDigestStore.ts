import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { getDailyDigestStats } from '@/lib/ai';
import { getLocalDayRange } from '@/lib/ai/digest-date';
import type { DigestArticleInput } from '@/lib/ai/digest-chunker';
import { extractPlainText } from '@/lib/security/sanitize-html';
import type {
  Article,
  DailyDigest,
  DailyDigestScope,
  DailyDigestStats,
} from '@/lib/types';
import { messageClient, type StoreMessageClient } from './message-client';

interface DailyDigestState {
  digest: DailyDigest | null;
  articles: Article[];
  scope: DailyDigestScope;
  stats: DailyDigestStats | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  hasNewContent: boolean;
  setScope(scope: DailyDigestScope): void;
  loadTodayDigest(): Promise<void>;
  prepareTodayDigest(maxArticles: 50 | 100 | 200): Promise<void>;
  generateTodayDigest(maxArticles: 50 | 100 | 200, force?: boolean): Promise<void>;
}

function toDigestInput(article: Article): DigestArticleInput {
  const summary = extractPlainText(article.summary);
  const contentExcerpt = extractPlainText(article.content).slice(0, 1200);
  return {
    articleId: article.id,
    title: article.title,
    source: '',
    author: article.author,
    publishedAt: article.publishedAt,
    summary: summary.slice(0, 800),
    contentExcerpt,
  };
}

export function createDailyDigestStore(client: StoreMessageClient) {
  return createStore<DailyDigestState>((set, get) => ({
    digest: null,
    articles: [],
    scope: 'all',
    stats: null,
    isLoading: false,
    isGenerating: false,
    error: null,
    hasNewContent: false,

    setScope(scope) {
      set({ scope, digest: null, articles: [], stats: null, hasNewContent: false, error: null });
    },

    async loadTodayDigest() {
      const range = getLocalDayRange();
      const response = await client.send<{ digest: DailyDigest | null }>({
        action: 'DAILY_DIGEST_GET',
        payload: { ...range, scope: get().scope },
      });
      if (!response.success) {
        set({ error: response.error ?? 'AI_REQUEST_FAILED' });
        return;
      }
      const digest = response.data?.digest ?? null;
      const articleIds = get().articles.map((article) => article.id);
      const comparedArticleIds = digest
        ? articleIds.slice(0, digest.articleIds.length)
        : [];
      set({
        digest,
        hasNewContent: Boolean(
          digest
          && (comparedArticleIds.length !== digest.articleIds.length
            || digest.articleIds.some((id, index) => id !== comparedArticleIds[index])),
        ),
      });
    },

    async prepareTodayDigest(maxArticles) {
      set({ isLoading: true, error: null });
      const range = getLocalDayRange();
      const response = await client.send<{ articles: Article[] }>({
        action: 'ARTICLE_LIST',
        payload: {
          publishedAfter: range.startAt,
          publishedBefore: range.endAt,
          onlyUnread: get().scope === 'unread',
        },
      });
      if (!response.success) {
        set({ isLoading: false, error: response.error ?? 'AI_REQUEST_FAILED' });
        return;
      }
      const articles = response.data?.articles ?? [];
      const processed = articles.slice(0, maxArticles).map(toDigestInput);
      set({
        articles,
        stats: getDailyDigestStats(articles.length, processed),
        isLoading: false,
      });
      await get().loadTodayDigest();
    },

    async generateTodayDigest(maxArticles, force = false) {
      if (get().isGenerating) return;
      if (get().articles.length === 0) {
        await get().prepareTodayDigest(maxArticles);
      }
      const articles = get().articles.slice(0, maxArticles);
      if (articles.length === 0) return;

      set({ isGenerating: true, error: null });
      const range = getLocalDayRange();
      const response = await client.send<{
        digest: DailyDigest;
        stats: DailyDigestStats;
        cached: boolean;
      }>({
        action: 'DAILY_DIGEST_GENERATE',
        payload: {
          ...range,
          scope: get().scope,
          articleExcerpts: articles.map((article) => ({
            articleId: article.id,
            textExcerpt: [
              extractPlainText(article.summary),
              extractPlainText(article.content),
            ].filter(Boolean).join('\n\n').slice(0, 1500),
          })),
          force,
        },
      });
      if (!response.success || !response.data?.digest) {
        set({ isGenerating: false, error: response.error ?? 'AI_REQUEST_FAILED' });
        return;
      }
      set({
        digest: response.data.digest,
        stats: response.data.stats,
        isGenerating: false,
        hasNewContent: false,
      });
    },
  }));
}

export const dailyDigestStore = createDailyDigestStore(messageClient);

export function useDailyDigestStore<T>(selector: (state: DailyDigestState) => T): T {
  return useStore(dailyDigestStore, selector);
}
