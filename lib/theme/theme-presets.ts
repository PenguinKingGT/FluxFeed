import type { ColorTheme } from '@/lib/types';

export const COLOR_THEMES: ColorTheme[] = ['quiet-signal', 'graphite', 'forest'];
export const DEFAULT_COLOR_THEME: ColorTheme = 'quiet-signal';

export function normalizeColorTheme(value: unknown): ColorTheme {
  return COLOR_THEMES.includes(value as ColorTheme) ? (value as ColorTheme) : DEFAULT_COLOR_THEME;
}
