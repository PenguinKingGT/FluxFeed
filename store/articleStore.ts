import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Article, ArticleAiSummary } from '@/lib/types';
import { searchArticles } from '@/lib/search/search-articles';
import { messageClient, type StoreMessageClient } from './message-client';

export interface ArticleFilter {
  view: 'inbox' | 'starred' | 'all' | 'folder' | 'feed';
  feedId?: string;
  folder?: string;
  searchQuery?: string;
  showUnreadOnly: boolean;
}

interface ArticleState {
  articles: Article[];
  activeArticleId: string | null;
  unreadCount: number;
  filter: ArticleFilter;
  isLoading: boolean;
  error: string | null;
  summaryStatusByArticleId: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  summaryErrorByArticleId: Record<string, string | undefined>;
  summaryStaleByArticleId: Record<string, boolean>;
  autoSummaryAttempts: Set<string>;
  loadArticles(filter?: Partial<ArticleFilter>): Promise<void>;
  loadUnreadCount(): Promise<void>;
  setFilter(filter: Partial<ArticleFilter>): void;
  setActiveArticle(articleId: string | null): void;
  markRead(articleId: string): Promise<void>;
  markAllRead(feedId?: string): Promise<void>;
  starArticle(articleId: string, starred: boolean): Promise<void>;
  summarizeArticle(
    articleId: string,
    contentText: string,
    options: { force?: boolean; trigger: 'manual' | 'auto' },
  ): Promise<void>;
  goNext(): void;
  goPrev(): void;
}

const DEFAULT_FILTER: ArticleFilter = { view: 'inbox', showUnreadOnly: true };

export function createArticleStore(client: StoreMessageClient) {
  return createStore<ArticleState>((set, get) => ({
    articles: [],
    activeArticleId: null,
    unreadCount: 0,
    filter: DEFAULT_FILTER,
    isLoading: false,
    error: null,
    summaryStatusByArticleId: {},
    summaryErrorByArticleId: {},
    summaryStaleByArticleId: {},
    autoSummaryAttempts: new Set(),

    async loadArticles(filterPatch = {}) {
      const filter = { ...get().filter, ...filterPatch };
      set({ filter, isLoading: true, error: null });
      const response = await client.send<{ articles: Article[] }>({
        action: 'ARTICLE_LIST',
        payload: {
          feedId: filter.feedId,
          groupId: filter.view === 'folder' ? filter.folder : undefined,
          onlyUnread: filter.view === 'inbox' ? filter.showUnreadOnly : false,
          onlyStarred: filter.view === 'starred',
        },
      });
      if (!response.success) {
        set({ isLoading: false, error: response.error ?? 'Failed to load articles' });
        return;
      }
      const articles = response.data?.articles ?? [];
      set({
        articles: searchArticles(articles, filter.searchQuery ?? ''),
        isLoading: false,
      });
    },

    async loadUnreadCount() {
      const response = await client.send<{ count: number }>({ action: 'GET_UNREAD_COUNT' });
      if (response.success) {
        set({ unreadCount: response.data?.count ?? 0 });
      } else {
        set({ error: response.error ?? 'Failed to load unread count' });
      }
    },

    setFilter(filter) {
      void get().loadArticles(filter);
    },

    setActiveArticle(articleId) {
      set({ activeArticleId: articleId });
    },

    async markRead(articleId) {
      const response = await client.send({ type: 'MARK_READ', articleIds: [articleId] });
      if (!response.success) {
        set({ error: response.error ?? 'Failed to mark article read' });
        return;
      }
      set((state) => ({
        articles: state.articles.map((item) =>
          item.id === articleId ? { ...item, isRead: true } : item,
        ),
      }));
      await get().loadUnreadCount();
    },

    async markAllRead(feedId) {
      const response = await client.send({ type: 'MARK_ALL_READ', feedId });
      if (!response.success) {
        set({ error: response.error ?? 'Failed to mark articles read' });
        return;
      }
      set((state) => ({ articles: state.articles.map((item) => ({ ...item, isRead: true })) }));
      await get().loadUnreadCount();
    },

    async starArticle(articleId, starred) {
      const response = await client.send({ type: 'STAR_ARTICLE', articleId, starred });
      if (!response.success) {
        set({ error: response.error ?? 'Failed to update star' });
        return;
      }
      set((state) => ({
        articles: state.articles.map((item) =>
          item.id === articleId ? { ...item, isStarred: starred } : item,
        ),
      }));
    },

    async summarizeArticle(articleId, contentText, options) {
      const state = get();
      if (state.summaryStatusByArticleId[articleId] === 'loading') return;
      if (options.trigger === 'auto' && state.autoSummaryAttempts.has(articleId)) return;

      if (options.trigger === 'auto') {
        set((current) => ({
          autoSummaryAttempts: new Set(current.autoSummaryAttempts).add(articleId),
        }));
      }
      set((current) => ({
        summaryStatusByArticleId: { ...current.summaryStatusByArticleId, [articleId]: 'loading' },
        summaryErrorByArticleId: { ...current.summaryErrorByArticleId, [articleId]: undefined },
      }));

      const response = await client.send<{
        summary: ArticleAiSummary;
        cached: boolean;
        stale: boolean;
      }>({
        action: 'ARTICLE_SUMMARIZE',
        payload: {
          articleId,
          contentText,
          force: options.force,
          trigger: options.trigger,
        },
      });
      if (!response.success || !response.data?.summary) {
        set((current) => ({
          summaryStatusByArticleId: { ...current.summaryStatusByArticleId, [articleId]: 'error' },
          summaryErrorByArticleId: {
            ...current.summaryErrorByArticleId,
            [articleId]: response.error ?? 'AI_REQUEST_FAILED',
          },
        }));
        return;
      }
      set((current) => ({
        articles: current.articles.map((item) =>
          item.id === articleId ? { ...item, aiSummary: response.data!.summary } : item,
        ),
        summaryStatusByArticleId: { ...current.summaryStatusByArticleId, [articleId]: 'success' },
        summaryStaleByArticleId: {
          ...current.summaryStaleByArticleId,
          [articleId]: Boolean(response.data?.stale),
        },
      }));
    },

    goNext() {
      const { articles, activeArticleId } = get();
      const index = articles.findIndex((item) => item.id === activeArticleId);
      if (index >= 0 && index < articles.length - 1) {
        get().setActiveArticle(articles[index + 1].id);
      }
    },

    goPrev() {
      const { articles, activeArticleId } = get();
      const index = articles.findIndex((item) => item.id === activeArticleId);
      if (index > 0) {
        get().setActiveArticle(articles[index - 1].id);
      }
    },
  }));
}

export const articleStore = createArticleStore(messageClient);
export function useArticleStore<T>(selector: (state: ArticleState) => T): T {
  return useStore(articleStore, selector);
}
