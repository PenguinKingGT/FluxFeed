import { afterEach, describe, expect, it } from 'vitest';

import { FluxFeedDatabase } from '@/lib/db/database';
import { ensureDatabaseDefaults, resetDatabase } from '@/lib/db/database-service';

describe('database service', () => {
  const db = new FluxFeedDatabase();

  afterEach(async () => {
    await resetDatabase(db);
  });

  it('writes default global settings when missing', async () => {
    await ensureDatabaseDefaults(db);

    const settings = await db.settings.get('global');

    expect(settings?.id).toBe('global');
    expect(settings?.refreshInterval).toBe(60);
    expect(settings?.maxArticlesPerFeed).toBe(200);
  });
});
