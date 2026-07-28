import { i18n } from '@/lib/i18n';
import { formatRelativeTime as localizeRelativeTime } from '@/lib/i18n/locale-format';
import type { Settings } from '@/lib/types';

export function formatRelativeTime(timestamp: number, languageOrNow?: Settings['language'] | number, now = Date.now()): string {
  if (typeof languageOrNow === 'number') {
    return localizeRelativeTime(timestamp, (i18n.language || 'en') as Settings['language'], languageOrNow);
  }
  return localizeRelativeTime(timestamp, languageOrNow ?? (i18n.language || 'en') as Settings['language'], now);
}
