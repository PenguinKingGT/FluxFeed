import type { FetchFeedResult } from '@/lib/feed';
import { createRecordId } from '@/lib/id';
import type { Article, Feed, ParsedArticle } from '@/lib/types';

export const REFRESH_CONCURRENCY = 5;

interface RefreshStorageService {
  getFeeds(): Promise<Feed[]>;
  getArticles(options?: { feedId?: string }): Promise<Pick<Article, 'id' | 'guid'>[]>;
  saveArticles(articles: Article[]): Promise<void>;
  updateFeed(feedId: string, patch: Partial<Feed>): Promise<void>;
}

export interface RefreshFeedsDependencies {
  storageService: RefreshStorageService;
  fetchFeed(url: string): Promise<FetchFeedResult>;
  now?: () => number;
}

export function convertParsedArticleToArticle(
  parsedArticle: ParsedArticle,
  feed: Feed,
  fetchedAt: number,
): Article {
  return {
    id: createRecordId(),
    feedId: feed.id,
    guid: parsedArticle.guid,
    title: parsedArticle.title,
    url: parsedArticle.url,
    author: parsedArticle.author,
    summary: parsedArticle.summary,
    content: parsedArticle.content,
    publishedAt: parsedArticle.publishedAt,
    isRead: false,
    isStarred: false,
    tags: [],
    fetchedAt,
  };
}

export async function refreshSingleFeed(
  feed: Feed,
  dependencies: RefreshFeedsDependencies,
): Promise<number> {
  const result = await dependencies.fetchFeed(feed.url);

  if (!result.success || !result.feed) {
    await dependencies.storageService.updateFeed(feed.id, { errorCount: feed.errorCount + 1 });
    return 0;
  }

  const fetchedAt = dependencies.now?.() ?? Date.now();
  const existingArticles = await dependencies.storageService.getArticles({ feedId: feed.id });
  const existingGuids = new Set(existingArticles.map((article) => article.guid));
  const newArticles = result.feed.articles
    .map((article) => convertParsedArticleToArticle(article, feed, fetchedAt))
    .filter((article) => !existingGuids.has(article.guid));

  if (newArticles.length > 0) {
    await dependencies.storageService.saveArticles(newArticles);
  }

  await dependencies.storageService.updateFeed(feed.id, {
    title: result.feed.title || feed.title,
    iconUrl: result.feed.iconUrl || feed.iconUrl,
    lastFetchedAt: fetchedAt,
    errorCount: 0,
  });

  return newArticles.length;
}

export async function refreshAllFeeds(dependencies: RefreshFeedsDependencies): Promise<number> {
  const feeds = await dependencies.storageService.getFeeds();
  let nextFeedIndex = 0;
  let total = 0;

  async function worker() {
    while (nextFeedIndex < feeds.length) {
      const feed = feeds[nextFeedIndex];
      nextFeedIndex += 1;
      const count = await refreshSingleFeed(feed, dependencies);
      total += count;
    }
  }

  const workerCount = Math.min(REFRESH_CONCURRENCY, feeds.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return total;
}
