import type { FluxFeedDatabase } from './database';
import { DEFAULT_SETTINGS } from './defaults';

export async function ensureDatabaseDefaults(database: FluxFeedDatabase): Promise<void> {
  const settings = await database.settings.get('global');

  if (!settings) {
    await database.settings.put(DEFAULT_SETTINGS);
    return;
  }

  await database.settings.put({
    ...DEFAULT_SETTINGS,
    ...settings,
    id: 'global',
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
