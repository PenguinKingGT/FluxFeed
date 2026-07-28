import { describe, expect, it } from 'vitest';
import type { Article } from '@/lib/types';
import { estimateReadMinutes, formatArticleDate, formatRelativeTime, getArticleTags } from '@/components/reader/reader-format';

function article(patch: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    feedId: 'f1',
    guid: 'g1',
    title: 'Title',
    url: 'https://example.com',
    author: '',
    summary: '',
    content: '',
    publishedAt: Date.UTC(2024, 2, 14),
    isRead: false,
    isStarred: false,
    tags: [],
    fetchedAt: Date.UTC(2024, 2, 14),
    ...patch,
  };
}

describe('reader format helpers', () => {
  it('formats compact relative time', () => {
    const now = Date.UTC(2024, 2, 14, 12, 0, 0);

    expect(formatRelativeTime(now, now)).toBe('now');
    expect(formatRelativeTime(now - 12 * 60_000, now)).toBe('12m');
    expect(formatRelativeTime(now - 2 * 60 * 60_000, now)).toBe('2h');
    expect(formatRelativeTime(now - 26 * 60 * 60_000, now)).toBe('1d');
  });

  it('formats article date like the template', () => {
    expect(formatArticleDate(Date.UTC(2024, 2, 14))).toBe('March 14, 2024');
  });

  it('estimates read minutes from html text', () => {
    expect(estimateReadMinutes('<p>short text</p>')).toBe('1 min read');
  });

  it('returns clean article tags without fallback labels', () => {
    expect(getArticleTags(article({ tags: ['Technology', 'Design', 'Technology', '  '] }))).toEqual(['Technology', 'Design']);
    expect(getArticleTags(article())).toEqual([]);
  });
});
