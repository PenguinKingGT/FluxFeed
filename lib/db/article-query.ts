import Dexie, { cmp } from 'dexie';
import type { Article } from '@/lib/types';
import type { FluxFeedDatabase } from './database';

export interface GetArticlesOptions {
  feedId?: string;
  groupId?: string;
  onlyUnread?: boolean;
  onlyStarred?: boolean;
  limit?: number;
  offset?: number;
  publishedAfter?: number;
  publishedBefore?: number;
}

/** Resolves source scope using metadata indexes without loading article bodies. */
async function getScopedFeedIds(
  database: FluxFeedDatabase,
  options: GetArticlesOptions,
): Promise<string[] | undefined> {
  if (!options.groupId) {
    return options.feedId ? [options.feedId] : undefined;
  }

  // Folders are at most two levels deep; selecting a parent includes its children.
  const childIds = await database.groups.where('parentId').equals(options.groupId).primaryKeys();
  const feedIds = await database.feeds
    .where('groupId')
    .anyOf([options.groupId, ...childIds])
    .primaryKeys();

  return options.feedId ? feedIds.filter((id) => id === options.feedId) : feedIds;
}

/** Applies flags and the inclusive-start/exclusive-end publication window. */
function matchesArticleFilters(article: Article, options: GetArticlesOptions): boolean {
  return (!options.onlyUnread || !article.isRead)
    && (!options.onlyStarred || article.isStarred)
    && (options.publishedAfter === undefined || article.publishedAt >= options.publishedAfter)
    && (options.publishedBefore === undefined || article.publishedAt < options.publishedBefore);
}

/** Reads scoped bodies only, or pages the global publication index before materialization. */
export async function queryArticles(
  database: FluxFeedDatabase,
  options: GetArticlesOptions = {},
): Promise<Article[]> {
  const offset = options.offset ?? 0;
  const end = options.limit === undefined ? undefined : offset + options.limit;
  if (
    options.limit === 0
    || (options.publishedAfter !== undefined
      && options.publishedBefore !== undefined
      && options.publishedAfter >= options.publishedBefore)
  ) {
    return [];
  }

  const feedIds = await getScopedFeedIds(database, options);
  if (feedIds) {
    if (feedIds.length === 0) {
      return [];
    }

    const articles = await database.articles
      .where('feedId')
      .anyOf(feedIds)
      .filter((article) => matchesArticleFilters(article, options))
      .toArray();
    // A source index cannot also order by date. Sort only the scoped results and
    // retain the old publication-index tie order (descending primary key).
    articles.sort((left, right) =>
      right.publishedAt - left.publishedAt || cmp(right.id, left.id),
    );
    return articles.slice(offset, end);
  }

  const hasDateRange = options.publishedAfter !== undefined || options.publishedBefore !== undefined;
  let collection = hasDateRange
    ? database.articles.where('publishedAt').between(
      options.publishedAfter ?? Dexie.minKey,
      options.publishedBefore ?? Dexie.maxKey,
      true,
      false,
    ).reverse()
    : database.articles.orderBy('publishedAt').reverse();

  if (options.onlyUnread || options.onlyStarred) {
    collection = collection.filter((article) => matchesArticleFilters(article, options));
  }

  // Preserve legacy Array.slice semantics for negative pagination arguments.
  if (offset < 0 || (options.limit !== undefined && options.limit < 0)) {
    return (await collection.toArray()).slice(offset, end);
  }

  collection = collection.offset(offset);
  if (options.limit !== undefined) {
    collection = collection.limit(options.limit);
  }
  return collection.toArray();
}
