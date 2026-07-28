import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Article, Feed } from '@/lib/types';
import { ArticleList } from '@/components/popup/ArticleList';
import { RecentArticlesHeader } from '@/components/popup/RecentArticlesHeader';
import { formatRelativeTime } from '@/components/popup/popup-format';

function article(patch: Partial<Article> = {}): Article {
  return {
    id: 'article-1',
    feedId: 'feed-1',
    guid: 'guid-1',
    title: 'The future of generative AI in high-end design workflows',
    url: 'https://example.com/article',
    author: '',
    summary: '',
    content: '',
    publishedAt: Date.now() - 12 * 60 * 1000,
    isRead: false,
    isStarred: false,
    tags: [],
    fetchedAt: Date.now(),
    ...patch,
  };
}

const feeds: Feed[] = [{
  id: 'feed-1',
  url: 'https://example.com/rss.xml',
  title: 'The Verge',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  refreshInterval: 30,
  errorCount: 0,
  createdAt: 1,
}];

describe('popup article list', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders unread count header', () => {
    render(<RecentArticlesHeader unreadCount={5} />);
    expect(screen.getByText('Recent Articles')).not.toBeNull();
    expect(screen.getByText('5 unread')).not.toBeNull();
  });

  it('formats relative time compactly', () => {
    expect(formatRelativeTime(Date.now() - 12 * 60 * 1000)).toBe('12m');
  });

  it('renders article source and opens article on click', () => {
    const onOpenArticle = vi.fn();
    render(<ArticleList articles={[article()]} feeds={feeds} onOpenArticle={onOpenArticle} />);

    fireEvent.click(screen.getByText(/future of generative AI/i));

    expect(screen.getByText('The Verge')).not.toBeNull();
    expect(onOpenArticle).toHaveBeenCalledWith('article-1');
  });

  it('renders no unread empty state when article list is empty', () => {
    render(<ArticleList articles={[]} feeds={feeds} onOpenArticle={vi.fn()} hasFeeds />);

    expect(screen.getByText('All caught up!')).not.toBeNull();
  });
});
