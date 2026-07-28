import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Article, Feed } from '@/lib/types';
import { ArticlePanel } from '@/components/reader/ArticlePanel';

function article(patch: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    feedId: 'f1',
    guid: 'g1',
    title: 'Understanding WXT Framework for Chrome Extensions',
    url: 'https://example.com/post',
    author: '',
    summary: 'WXT is the next-gen framework making extension development seamless.',
    content: '',
    publishedAt: Date.now() - 2 * 60 * 60_000,
    isRead: false,
    isStarred: false,
    tags: ['Technology'],
    fetchedAt: Date.now(),
    ...patch,
  };
}

const feed: Feed = {
  id: 'f1',
  url: 'https://example.com/rss.xml',
  title: 'The Verge',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  refreshInterval: 30,
  errorCount: 0,
  createdAt: 1,
};

describe('Reader ArticlePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders article list shell without duplicate view tabs', () => {
    const setFilter = vi.fn();
    const refreshFeed = vi.fn();
    const setActiveArticle = vi.fn();

    render(
      <ArticlePanel
        articles={[article(), article({ id: 'a2', isRead: true, title: 'Read article' })]}
        feeds={[feed]}
        activeArticleId="a1"
        filter={{ view: 'inbox', showUnreadOnly: true }}
        isLoading={false}
        setFilter={setFilter}
        refreshFeed={refreshFeed}
        setActiveArticle={setActiveArticle}
        onOpenNavigation={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Search articles...')).not.toBeNull();
    expect(screen.queryByLabelText('Filter articles')).toBeNull();
    expect(screen.getByLabelText('Refresh feeds')).not.toBeNull();
    expect(screen.queryByText('Unread')).toBeNull();
    expect(screen.queryByText('All Articles')).toBeNull();
    expect(screen.getByText('Understanding WXT Framework for Chrome Extensions')).not.toBeNull();
    expect(screen.getAllByText('The Verge').length).toBeGreaterThan(0);
    expect(screen.getByText('Understanding WXT Framework for Chrome Extensions').closest('article')?.className).toContain('bg-accent');
    expect(screen.getByText('Read article').closest('article')?.className).toContain('opacity-50');

    fireEvent.click(screen.getByLabelText('Refresh feeds'));
    expect(refreshFeed).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Understanding WXT Framework for Chrome Extensions'));
    expect(setActiveArticle).toHaveBeenCalledWith('a1');

    fireEvent.change(screen.getByPlaceholderText('Search articles...'), { target: { value: 'wxt' } });
    act(() => vi.advanceTimersByTime(300));
    expect(setFilter).toHaveBeenCalledWith({ searchQuery: 'wxt' });
  });

  it('renders only article tags and hides fallback labels', () => {
    render(
      <ArticlePanel
        articles={[article({ tags: ['Technology', 'Design'] }), article({ id: 'a2', title: 'Untagged article', tags: [] })]}
        feeds={[feed]}
        activeArticleId="a1"
        filter={{ view: 'inbox', showUnreadOnly: true }}
        isLoading={false}
        setFilter={vi.fn()}
        refreshFeed={vi.fn()}
        setActiveArticle={vi.fn()}
        onOpenNavigation={vi.fn()}
      />,
    );

    expect(screen.getByText('Technology')).not.toBeNull();
    expect(screen.getByText('Design')).not.toBeNull();
    expect(screen.getByText('Untagged article').closest('article')?.textContent).not.toContain('General');
  });
});
