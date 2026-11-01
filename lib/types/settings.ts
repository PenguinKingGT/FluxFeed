export type ArticleStyle = 'default' | 'vue' | 'github' | 'editorial' | 'minimal';

export type ReadingFont = 'system-serif' | 'system-sans' | 'lxgw-wenkai';
export type InterfaceFont = 'system-sans' | 'lxgw-wenkai';
export type ColorTheme =
  | 'white'
  | 'sky'
  | 'mint'
  | 'peach'
  | 'quiet-signal'
  | 'graphite'
  | 'forest';
export type AiSummaryLanguage = 'auto' | 'zh-CN' | 'en' | 'ja';
export type AiSummaryLength = 'brief' | 'standard' | 'detailed';

export type AiProvider = 'openai-compatible' | 'google' | 'anthropic';

export interface AiPreferences {
  /** Absent in legacy data, which always uses OpenAI-compatible transport. */
  provider?: AiProvider;
  apiUrl: string;
  model: string;
  summaryLanguage: AiSummaryLanguage;
  summaryLength: AiSummaryLength;
  customInstructions: string;
  dailyDigestMaxArticles: 50 | 100 | 200;
  /** Missing in legacy settings means visible; hiding also pauses automatic summaries. */
  showArticleSummary?: boolean;
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
  /** Missing in older installations keeps the original article presentation. */
  articleStyle?: ArticleStyle;
  readingFont: ReadingFont;
  interfaceFont: InterfaceFont;
  fontSize: 'small' | 'medium' | 'large';
  markReadOnOpen: boolean;
  showUnreadOnly: boolean;
  ai: AiPreferences;
}

/** Updates only supplied fields; nested AI preferences are merged independently. */
export type SettingsPatch = Omit<Partial<Settings>, 'ai'> & {
  ai?: Partial<AiPreferences>;
};
