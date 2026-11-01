import type { FetchFeedResult } from '@/lib/feed';
import type { StorageService } from '@/lib/db/storage-service';
import { createRecordId } from '@/lib/id';
import type { FeedRefreshResult } from '@/lib/types/feed';
import type { Article, Feed, ParsedArticle } from '@/lib/types';

export const REFRESH_CONCURRENCY = 5;

type RefreshStorageService = Pick<
  StorageService,
  'getFeeds' | 'commitFeedRefresh' | 'updateFeed'
>;

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

/**
 * Fetches outside transactions and reports transport/parse failures without claiming success.
 * Storage errors reject; the batch caller aggregates them after draining its workers.
 * Atomic commits still check parent existence and GUID uniqueness.
 */
export async function refreshSingleFeed(
  feed: Feed,
  dependencies: RefreshFeedsDependencies,
): Promise<FeedRefreshResult> {
  const result = await dependencies.fetchFeed(feed.url);

  if (!result.success || !result.feed) {
    await dependencies.storageService.updateFeed(feed.id, { errorCount: feed.errorCount + 1 });
    return { count: 0, failedCount: 1 };
  }

  const fetchedAt = dependencies.now?.() ?? Date.now();
  const articles = result.feed.articles
    .map((article) => convertParsedArticleToArticle(article, feed, fetchedAt));

  const count = await dependencies.storageService.commitFeedRefresh(feed.id, articles, {
    title: result.feed.title || feed.title,
    iconUrl: result.feed.iconUrl || feed.iconUrl,
    lastFetchedAt: fetchedAt,
    errorCount: 0,
  });
  return { count, failedCount: 0 };
}

/** Drains all feeds before returning actual additions and the number that failed. */
export async function refreshAllFeeds(dependencies: RefreshFeedsDependencies): Promise<FeedRefreshResult> {
  const feeds = await dependencies.storageService.getFeeds();
  let nextFeedIndex = 0;
  let total = 0;
  let failedCount = 0;

  /** A failed fetch or storage operation must not abandon the rest of the batch. */
  async function worker(): Promise<void> {
    while (nextFeedIndex < feeds.length) {
      const feed = feeds[nextFeedIndex];
      nextFeedIndex += 1;
      try {
        const result = await refreshSingleFeed(feed, dependencies);
        total += result.count;
        failedCount += result.failedCount;
      } catch {
        // Individual storage failures are reported only after every worker has finished.
        failedCount += 1;
      }
    }
  }

  const workerCount = Math.min(REFRESH_CONCURRENCY, feeds.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { count: total, failedCount };
}
