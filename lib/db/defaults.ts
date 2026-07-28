import type { Settings } from '@/lib/types/settings';

export const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  refreshInterval: 60,
  maxArticlesPerFeed: 200,
  retentionDays: 90,
  theme: 'system',
  colorTheme: 'quiet-signal',
  language: 'en',
  readingFont: 'system-serif',
  interfaceFont: 'system-sans',
  fontSize: 'medium',
  markReadOnOpen: true,
  showUnreadOnly: false,
  ai: {
    apiUrl: '',
    model: '',
    summaryLanguage: 'auto',
    summaryLength: 'standard',
    customInstructions: '',
    dailyDigestMaxArticles: 100,
    autoSummarizeOnOpen: false,
    autoSummarizeMinCharacters: 1000,
  },
};
