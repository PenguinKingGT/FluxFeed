import { describe, expect, it } from 'vitest';

import {
  DATABASE_NAME,
  FluxFeedDatabase,
  ensureDatabaseDefaults,
} from '@/lib/db';

describe('database exports', () => {
  it('exports database metadata, class, and services', () => {
    expect(DATABASE_NAME).toBe('flux-feed-db');
    expect(FluxFeedDatabase).toBeTypeOf('function');
    expect(ensureDatabaseDefaults).toBeTypeOf('function');
  });
});
