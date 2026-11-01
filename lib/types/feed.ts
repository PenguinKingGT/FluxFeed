export interface Feed {
  id: string;
  url: string;
  title: string;
  description: string;
  siteUrl: string;
  iconUrl: string;
  groupId?: string;
  order?: number;
  refreshInterval: number;
  lastFetchedAt?: number;
  errorCount: number;
  createdAt: number;
}

/** Reports committed additions separately from failed feeds, including partial refreshes. */
export interface FeedRefreshResult {
  count: number;
  failedCount: number;
}
