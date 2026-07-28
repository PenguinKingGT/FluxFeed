import type { Article } from '@/lib/types';
import { i18n } from '@/lib/i18n';
import {
  estimateReadMinutes as localizeReadMinutes,
  formatArticleDate as localizeArticleDate,
  formatRelativeTime as localizeRelativeTime,
} from '@/lib/i18n/locale-format';
import type { Settings } from '@/lib/types';

function currentLanguage(): Settings['language'] {
  return (i18n.language || 'en') as Settings['language'];
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  return localizeRelativeTime(timestamp, currentLanguage(), now);
}

export function formatArticleDate(timestamp: number, language = currentLanguage()): string {
  return localizeArticleDate(timestamp, language);
}

export function estimateReadMinutes(html: string, language = currentLanguage()): string {
  return localizeReadMinutes(html, language);
}

export function getArticleTags(article: Article): string[] {
  return Array.from(new Set(article.tags.map((tag) => tag.trim()).filter(Boolean)));
}
