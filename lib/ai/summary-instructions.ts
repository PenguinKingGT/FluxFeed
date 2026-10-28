import type { AiPreferences } from '@/lib/types';

const LANGUAGE_LABELS = {
  auto: 'the language used by the supplied source material',
  'zh-CN': 'Simplified Chinese',
  en: 'English',
  ja: 'Japanese',
} as const;

const LENGTH_LABELS = {
  brief: 'Keep the overview under 100 words.',
  standard: 'Keep the overview under 220 words.',
  detailed: 'Keep the overview under 400 words.',
} as const;

/** Applies the same output preferences to article sections and digest synthesis. */
export function createSummaryInstructions(preferences: AiPreferences): string[] {
  return [
    `Write in ${LANGUAGE_LABELS[preferences.summaryLanguage]}.`,
    LENGTH_LABELS[preferences.summaryLength],
  ];
}
