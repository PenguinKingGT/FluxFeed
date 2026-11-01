import type { Article } from '@/lib/types';
import type { FluxFeedDatabase } from './database';

/**
 * Rechecks stale cleanup candidates and deletes eligible records in one write transaction.
 * Candidate discovery stays outside this transaction so user writes are not blocked by scans.
 */
export async function deletePrunableCandidates(
  database: FluxFeedDatabase,
  articleIds: string[],
  olderThan?: number,
): Promise<void> {
  if (articleIds.length === 0) {
    return;
  }

  await database.transaction('rw', database.articles, async () => {
    const currentArticles = await database.articles.bulkGet(articleIds);
    const removable = currentArticles.filter((article): article is Article =>
      article !== undefined
      && article.isRead
      && !article.isStarred
      && (olderThan === undefined || article.fetchedAt < olderThan),
    );

    // A favorite or unread update committed before this transaction must win over the old snapshot.
    if (removable.length > 0) {
      await database.articles.bulkDelete(removable.map((article) => article.id));
    }
  });
}
