import { AI_PROVIDER_BASE_URLS, normalizeAiProvider } from './provider-settings';
import type { AiPreferences } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/db/defaults';

const ARTICLE_LIMITS = new Set([50, 100, 200]);

/** Normalizes persisted settings while retaining legacy compatible configurations. */
export function sanitizeAiPreferences(value: AiPreferences): AiPreferences {
  const minimum = Number.isFinite(value.autoSummarizeMinCharacters)
    ? Math.round(value.autoSummarizeMinCharacters)
    : DEFAULT_SETTINGS.ai.autoSummarizeMinCharacters;

  return {
    provider: normalizeAiProvider(value.provider),
    apiUrl: value.apiUrl.trim(),
    model: value.model.trim(),
    summaryLanguage: value.summaryLanguage,
    summaryLength: value.summaryLength,
    customInstructions: value.customInstructions.trim().slice(0, 2000),
    dailyDigestMaxArticles: ARTICLE_LIMITS.has(value.dailyDigestMaxArticles)
      ? value.dailyDigestMaxArticles
      : 100,
    showArticleSummary: value.showArticleSummary !== false,
    autoSummarizeOnOpen: value.autoSummarizeOnOpen,
    autoSummarizeMinCharacters: Math.min(50000, Math.max(0, minimum)),
  };
}

/** Native providers may use their official base URL when no override is saved. */
export function isAiConfigured(preferences: AiPreferences): boolean {
  if (!preferences.model.trim()) return false;
  try {
    const provider = normalizeAiProvider(preferences.provider);
    const url = new URL(preferences.apiUrl.trim() || AI_PROVIDER_BASE_URLS[provider]);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Counts Unicode code points for user-facing automatic summary thresholds. */
export function countUnicodeCharacters(value: string): number {
  return Array.from(value).length;
}

