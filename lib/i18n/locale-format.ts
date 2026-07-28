import { i18n } from './index';
import type { Settings } from '@/lib/types';

const locales: Record<Settings['language'], string> = {
  en: 'en-US',
  'zh-CN': 'zh-CN',
  ja: 'ja-JP',
};

export function formatArticleDate(timestamp: number, language: Settings['language'] = i18n.language as Settings['language']): string {
  return new Intl.DateTimeFormat(locales[language] ?? locales.en, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

export function formatRelativeTime(timestamp: number, language: Settings['language'] = i18n.language as Settings['language'], now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60_000);
  const t = i18n.getFixedT(language);
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

export function estimateReadMinutes(html: string, language: Settings['language'] = i18n.language as Settings['language']): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const minutes = Math.max(1, Math.ceil(text.split(' ').filter(Boolean).length / 220));
  return i18n.getFixedT(language)('time.readMinutes', { count: minutes });
}
