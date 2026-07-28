export type ReadingFont = 'system-serif' | 'system-sans' | 'lxgw-wenkai';
export type InterfaceFont = 'system-sans' | 'lxgw-wenkai';
export type ColorTheme = 'quiet-signal' | 'graphite' | 'forest';
export type AiSummaryLanguage = 'auto' | 'zh-CN' | 'en' | 'ja';
export type AiSummaryLength = 'brief' | 'standard' | 'detailed';

export interface AiPreferences {
  apiUrl: string;
  model: string;
  summaryLanguage: AiSummaryLanguage;
  summaryLength: AiSummaryLength;
  customInstructions: string;
  dailyDigestMaxArticles: 50 | 100 | 200;
  autoSummarizeOnOpen: boolean;
  autoSummarizeMinCharacters: number;
}

export interface Settings {
  id: 'global';
  refreshInterval: number;
  maxArticlesPerFeed: number;
  retentionDays: number;
  theme: 'light' | 'dark' | 'system';
  colorTheme: ColorTheme;
  language: 'en' | 'zh-CN' | 'ja';
  readingFont: ReadingFont;
  interfaceFont: InterfaceFont;
  fontSize: 'small' | 'medium' | 'large';
  markReadOnOpen: boolean;
  showUnreadOnly: boolean;
  ai: AiPreferences;
}
