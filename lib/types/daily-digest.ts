export type DailyDigestScope = 'all' | 'unread';

export interface DailyDigestEntry {
  articleId: string;
  title: string;
  source: string;
  publishedAt: number;
  brief: string;
  whyItMatters: string;
  topics: string[];
}

export interface DailyDigestTopic {
  name: string;
  overview: string;
  articleIds: string[];
}

export interface DailyDigest {
  id: string;
  dayKey: string;
  timeZone: string;
  scope: DailyDigestScope;
  articleIds: string[];
  overview: string;
  topics: DailyDigestTopic[];
  entries: DailyDigestEntry[];
  generatedAt: number;
  model: string;
  sourceFingerprint: string;
  promptVersion: 1;
}

export interface DailyDigestStats {
  totalArticles: number;
  processedArticles: number;
  chunkCount: number;
  estimatedRequests: number;
}
