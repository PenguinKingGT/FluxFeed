import type { MessageAction } from '@/lib/types/message';

export const MESSAGE_ACTIONS = {
  feedAdd: 'FEED_ADD',
  feedDelete: 'FEED_DELETE',
  feedRefresh: 'FEED_REFRESH',
  feedRefreshAll: 'FEED_REFRESH_ALL',
  articleMarkRead: 'ARTICLE_MARK_READ',
  articleStar: 'ARTICLE_STAR',
  articleMarkAllRead: 'ARTICLE_MARK_ALL_READ',
  settingsUpdate: 'SETTINGS_UPDATE',
  aiCredentialStatus: 'AI_CREDENTIAL_STATUS',
  aiCredentialUpdate: 'AI_CREDENTIAL_UPDATE',
  aiConnectionTest: 'AI_CONNECTION_TEST',
  articleSummarize: 'ARTICLE_SUMMARIZE',
  dailyDigestGet: 'DAILY_DIGEST_GET',
  dailyDigestGenerate: 'DAILY_DIGEST_GENERATE',
  opmlImport: 'OPML_IMPORT',
  opmlExport: 'OPML_EXPORT',
  pageFeedDetected: 'PAGE_FEED_DETECTED',
} as const satisfies Record<string, MessageAction>;
