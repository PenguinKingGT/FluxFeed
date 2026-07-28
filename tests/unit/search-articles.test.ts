import { describe, expect, it } from 'vitest';
import type { Article } from '@/lib/types';
import { searchArticles } from '@/lib/search/search-articles';

function article(patch: Partial<Article> = {}): Article {
  return {
    id: 'article-1',
    feedId: 'feed-1',
    guid: 'guid-1',
    title: 'TypeScript Patterns',
    url: 'https://example.com/article',
    author: 'Ada',
    summary: 'Reliable application architecture',
    content: '<p>Build accessible React interfaces.</p>',
    publishedAt: 1,
    isRead: false,
    isStarred: false,
    tags: ['frontend'],
    fetchedAt: 1,
    ...patch,
  };
}

describe('searchArticles', () => {
  const articles = [
    article(),
    article({ id: 'article-2', guid: 'guid-2', title: 'Gardening', author: 'Lin', content: '<p>Tomatoes</p>', tags: [] }),
  ];

  it('searches title, content, author, and tags case-insensitively', () => {
    expect(searchArticles(articles, 'typescript')).toHaveLength(1);
    expect(searchArticles(articles, 'ACCESSIBLE react')).toHaveLength(1);
    expect(searchArticles(articles, 'ada frontend')).toHaveLength(1);
  });

  it('returns the original list for an empty query', () => {
    expect(searchArticles(articles, '  ')).toBe(articles);
  });
});
