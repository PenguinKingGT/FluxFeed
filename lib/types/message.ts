import type { DetectedFeed } from '@/lib/content/content-detector';
import type { Settings } from './settings';

export type MessageAction =
  | 'FEED_ADD'
  | 'FEED_DELETE'
  | 'FEED_REFRESH'
  | 'FEED_REFRESH_ALL'
  | 'FEED_LIST'
  | 'GROUP_LIST'
  | 'GROUP_CREATE'
  | 'GROUP_DELETE'
  | 'TREE_MOVE'
  | 'ARTICLE_LIST'
  | 'ARTICLE_MARK_READ'
  | 'ARTICLE_STAR'
  | 'ARTICLE_MARK_ALL_READ'
  | 'SETTINGS_UPDATE'
  | 'SETTINGS_GET'
  | 'AI_CREDENTIAL_STATUS'
  | 'AI_CREDENTIAL_UPDATE'
  | 'AI_CONNECTION_TEST'
  | 'ARTICLE_SUMMARIZE'
  | 'DAILY_DIGEST_GET'
  | 'DAILY_DIGEST_GENERATE'
  | 'GET_UNREAD_COUNT'
  | 'OPML_IMPORT'
  | 'OPML_EXPORT'
  | 'PAGE_FEED_DETECTED';

export interface Message<T = unknown> {
  action: MessageAction;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type BackgroundMessage =
  | { type: 'ADD_FEED'; url: string; groupId?: string }
  | { type: 'REMOVE_FEED'; feedId: string }
  | { type: 'FETCH_NOW'; feedId?: string }
  | { type: 'MARK_READ'; articleIds: string[] }
  | { type: 'MARK_ALL_READ'; feedId?: string }
  | { type: 'STAR_ARTICLE'; articleId: string; starred: boolean }
  | { type: 'GET_UNREAD_COUNT' }
  | ({ type: 'SETTINGS_UPDATE' } & Partial<Settings>)
  | { type: 'FEEDS_DETECTED'; feeds: DetectedFeed[]; pageUrl: string; pageTitle: string }
  | { type: 'GET_DETECTED_FEEDS' };

export interface DetectedFeedsSnapshot {
  feeds: DetectedFeed[];
  pageUrl: string;
  pageTitle: string;
  detectedAt: number;
}

export type BackgroundMessageResponse<T = unknown> = MessageResponse<T>;
