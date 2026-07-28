import type { Settings } from '@/lib/types';

export const READING_FONT_SIZE_PX: Record<Settings['fontSize'], number> = {
  small: 15,
  medium: 17,
  large: 19,
};

export function getReadingFontSize(fontSize: Settings['fontSize'] | number): number {
  if (typeof fontSize === 'number') return fontSize;
  return READING_FONT_SIZE_PX[fontSize] ?? READING_FONT_SIZE_PX.medium;
}
