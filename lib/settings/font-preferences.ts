import type { InterfaceFont, ReadingFont } from '@/lib/types/settings';

export const READING_FONTS: ReadingFont[] = ['system-serif', 'system-sans', 'lxgw-wenkai'];
export const INTERFACE_FONTS: InterfaceFont[] = ['system-sans', 'lxgw-wenkai'];

export const FONT_FAMILIES = {
  'system-serif': '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Noto Serif SC", serif',
  'system-sans': '"Avenir Next", Avenir, "Segoe UI", "Noto Sans SC", sans-serif',
  'lxgw-wenkai': '"LXGW WenKai Lite", "Noto Serif SC", serif',
} as const satisfies Record<ReadingFont | InterfaceFont, string>;

export function normalizeReadingFont(value: unknown): ReadingFont {
  return READING_FONTS.includes(value as ReadingFont) ? (value as ReadingFont) : 'system-serif';
}

export function normalizeInterfaceFont(value: unknown): InterfaceFont {
  return INTERFACE_FONTS.includes(value as InterfaceFont) ? (value as InterfaceFont) : 'system-sans';
}

export function applyFontPreferences(readingFont: unknown, interfaceFont: unknown): void {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.readingFont = normalizeReadingFont(readingFont);
  document.documentElement.dataset.interfaceFont = normalizeInterfaceFont(interfaceFont);
}
