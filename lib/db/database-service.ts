import type { FluxFeedDatabase } from './database';
import { DEFAULT_SETTINGS } from './defaults';

/** Initializes a missing record atomically; existing preferences must never be rewritten by reads. */
export async function ensureDatabaseDefaults(database: FluxFeedDatabase): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    if (!await database.settings.get('global')) {
      await database.settings.add(DEFAULT_SETTINGS);
    }
  });
}

export async function resetDatabase(database: FluxFeedDatabase): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.feeds,
      database.articles,
      database.groups,
      database.settings,
      database.dailyDigests,
    ],
    async () => {
      await database.feeds.clear();
      await database.articles.clear();
      await database.groups.clear();
      await database.settings.clear();
      await database.dailyDigests.clear();
    },
  );
}
