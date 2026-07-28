export interface ParsedArticle {
  guid: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  publishedAt: number;
  url: string;
}

export interface ParsedFeed {
  title: string;
  description: string;
  siteUrl: string;
  iconUrl: string;
  articles: ParsedArticle[];
}

export type FeedFormat = 'rss' | 'atom' | 'json';

export class FeedParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedParseError';
  }
}
