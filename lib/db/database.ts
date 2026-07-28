import Dexie, { type EntityTable } from 'dexie';

import type { Article, DailyDigest, Feed, Group, Settings } from '@/lib/types';
import { DATABASE_NAME, DATABASE_STORES, DATABASE_VERSION } from './schema';

export class FluxFeedDatabase extends Dexie {
  feeds!: EntityTable<Feed, 'id'>;
  articles!: EntityTable<Article, 'id'>;
  groups!: EntityTable<Group, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  dailyDigests!: EntityTable<DailyDigest, 'id'>;

  constructor() {
    super(DATABASE_NAME);

    this.version(DATABASE_VERSION).stores(DATABASE_STORES);
  }
}

export const db = new FluxFeedDatabase();
