export interface ArticleAiSummary {
  overview: string;
  keyPoints: string[];
  generatedAt: number;
  model: string;
  sourceFingerprint: string;
  promptVersion: 1;
}

export interface Article {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  url: string;
  author: string;
  summary: string;
  content: string;
  publishedAt: number;
  isRead: boolean;
  isStarred: boolean;
  starredAt?: number;
  tags: string[];
  fetchedAt: number;
  aiSummary?: ArticleAiSummary;
}
