import type { AiPreferences } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/db/defaults';

const ARTICLE_LIMITS = new Set([50, 100, 200]);

export function sanitizeAiPreferences(value: AiPreferences): AiPreferences {
  const minimum = Number.isFinite(value.autoSummarizeMinCharacters)
    ? Math.round(value.autoSummarizeMinCharacters)
    : DEFAULT_SETTINGS.ai.autoSummarizeMinCharacters;

  return {
    apiUrl: value.apiUrl.trim(),
    model: value.model.trim(),
    summaryLanguage: value.summaryLanguage,
    summaryLength: value.summaryLength,
    customInstructions: value.customInstructions.trim().slice(0, 2000),
    dailyDigestMaxArticles: ARTICLE_LIMITS.has(value.dailyDigestMaxArticles)
      ? value.dailyDigestMaxArticles
      : 100,
    autoSummarizeOnOpen: value.autoSummarizeOnOpen,
    autoSummarizeMinCharacters: Math.min(50000, Math.max(0, minimum)),
  };
}

export function isAiConfigured(preferences: AiPreferences): boolean {
  if (!preferences.model.trim()) return false;
  try {
    const url = new URL(preferences.apiUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function countUnicodeCharacters(value: string): number {
  return Array.from(value).length;
}

