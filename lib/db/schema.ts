export const DATABASE_NAME = 'flux-feed-db';

export const DATABASE_VERSION = 3;

export const DATABASE_STORES = {
  feeds: '++id,&url,groupId,lastFetchedAt',
  articles: '++id,feedId,[feedId+guid],publishedAt,isRead,isStarred',
  groups: '++id,parentId,order',
  settings: 'id',
  dailyDigests: '&id,dayKey,generatedAt',
} as const;
