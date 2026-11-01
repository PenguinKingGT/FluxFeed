import { afterEach, describe, expect, it, vi } from 'vitest';

import { FluxFeedDatabase } from '@/lib/db/database';
import { ensureDatabaseDefaults, resetDatabase } from '@/lib/db/database-service';
import { createStorageService } from '@/lib/db/storage-service';

describe('database service', () => {
  const db = new FluxFeedDatabase();

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetDatabase(db);
  });

  it('writes default global settings when missing', async () => {
    await ensureDatabaseDefaults(db);

    const settings = await db.settings.get('global');

    expect(settings?.id).toBe('global');
    expect(settings?.refreshInterval).toBe(60);
    expect(settings?.maxArticlesPerFeed).toBe(200);
  });

  it('does not rewrite an existing settings record during initialization', async () => {
    const storage = createStorageService(db);
    await storage.saveSettings({ theme: 'dark' });
    const put = vi.spyOn(db.settings, 'put');

    await ensureDatabaseDefaults(db);

    expect(put).not.toHaveBeenCalled();
    expect((await db.settings.get('global'))?.theme).toBe('dark');
  });

  it.each([true, false])('preserves a save concurrent with default initialization (save first: %s)', async (saveFirst) => {
    const storage = createStorageService(db);
    await Promise.all(saveFirst
      ? [storage.saveSettings({ theme: 'dark' }), ensureDatabaseDefaults(db)]
      : [ensureDatabaseDefaults(db), storage.saveSettings({ theme: 'dark' })]);

    expect((await storage.getSettings()).theme).toBe('dark');
  });
});
