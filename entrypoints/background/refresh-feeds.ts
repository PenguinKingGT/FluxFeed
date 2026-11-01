import type { FetchFeedResult } from '@/lib/feed';
import type { StorageService } from '@/lib/db/storage-service';
import { createRecordId } from '@/lib/id';
import type { Article, Feed, ParsedArticle } from '@/lib/types';

export const REFRESH_CONCURRENCY = 5;

type RefreshStorageService = Pick<
  StorageService,
  'getFeeds' | 'getArticleGuids' | 'commitFeedRefresh' | 'updateFeed'
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

/** Fetches outside transactions, then commits new articles only if the feed has not been deleted. */
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
  const existingGuids = new Set(await dependencies.storageService.getArticleGuids(feed.id));
  const newArticles = result.feed.articles
    .map((article) => convertParsedArticleToArticle(article, feed, fetchedAt))
    .filter((article) => !existingGuids.has(article.guid));

  return dependencies.storageService.commitFeedRefresh(feed.id, newArticles, {
    title: result.feed.title || feed.title,
    iconUrl: result.feed.iconUrl || feed.iconUrl,
    lastFetchedAt: fetchedAt,
    errorCount: 0,
  });
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
