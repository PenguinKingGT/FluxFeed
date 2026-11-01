import type { ArticleStyle } from '@/lib/types';

export const ARTICLE_STYLES: readonly ArticleStyle[] = [
  'default',
  'vue',
  'github',
  'editorial',
  // Keep persisted selections compatible; this slot now renders the bundled Lightmind adaptation.
  'minimal',
  'drake',
  'purple',
  'ursine',
  'lapis',
];

/** Only bundled styles can reach the reader; old or unknown values retain its original look. */
export function normalizeArticleStyle(value: unknown): ArticleStyle {
  return ARTICLE_STYLES.find((style) => style === value) ?? 'default';
}
