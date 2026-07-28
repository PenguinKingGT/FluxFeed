import { describe, expect, it } from 'vitest';

import { FluxFeedDatabase } from '@/lib/db/database';
import { DATABASE_NAME, DATABASE_STORES, DATABASE_VERSION } from '@/lib/db/schema';

describe('database schema', () => {
  it('defines the initial database metadata', () => {
    expect(DATABASE_NAME).toBe('flux-feed-db');
    expect(DATABASE_VERSION).toBe(3);
    expect(DATABASE_STORES.feeds).toContain('&url');
    expect(DATABASE_STORES.articles).toContain('[feedId+guid]');
    expect(DATABASE_STORES.dailyDigests).toContain('&id');
    expect(DATABASE_STORES.groups).toContain('parentId');
  });

  it('creates typed Dexie tables', () => {
    const db = new FluxFeedDatabase();

    expect(db.feeds).toBeDefined();
    expect(db.articles).toBeDefined();
    expect(db.groups).toBeDefined();
    expect(db.settings).toBeDefined();

    db.close();
  });
});
