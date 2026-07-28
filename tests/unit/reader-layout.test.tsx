import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Article } from '@/lib/types';
import { ReaderLayout } from '@/components/reader/ReaderLayout';

const loadArticles = vi.fn();
const loadUnreadCount = vi.fn();
const goNext = vi.fn();
const goPrev = vi.fn();
const markRead = vi.fn();
const starArticle = vi.fn();
const setActiveArticle = vi.fn();
const openArticleUrl = vi.fn();

const activeArticle: Article = {
  id: 'a1',
  feedId: 'f1',
  guid: 'g1',
  title: 'Active',
  url: 'https://example.com/post',
  author: '',
  summary: '',
  content: '<p>Body</p>',
  publishedAt: Date.now(),
  isRead: false,
  isStarred: false,
  tags: [],
  fetchedAt: Date.now(),
};

vi.mock('@/store', () => ({
  useArticleStore: (selector: any) =>
    selector({
      articles: [activeArticle],
      activeArticleId: 'a1',
      unreadCount: 7,
      filter: { view: 'inbox', showUnreadOnly: true },
      isLoading: false,
      loadArticles,
      loadUnreadCount,
      setFilter: vi.fn(),
      setActiveArticle,
      markRead,
      starArticle,
      goNext,
      goPrev,
    }),
  useFeedStore: (selector: any) =>
    selector({
      feeds: [],
      addFeed: vi.fn(),
      removeFeed: vi.fn(),
      loadFeeds: vi.fn(),
      refreshFeed: vi.fn(),
    }),
  useGroupStore: (selector: any) =>
    selector({
      groups: [],
      loadGroups: vi.fn(),
      createGroup: vi.fn(),
      deleteGroup: vi.fn(),
      moveTreeNode: vi.fn(),
    }),
  useSettingsStore: (selector: any) =>
    selector({
      settings: {
        id: 'global',
        refreshInterval: 30,
        maxArticlesPerFeed: 200,
        retentionDays: 90,
        theme: 'light',
        colorTheme: 'quiet-signal',
        language: 'en',
        readingFont: 'system-serif',
        interfaceFont: 'system-sans',
        fontSize: 'medium',
        markReadOnOpen: false,
        showUnreadOnly: false,
      },
    }),
}));

vi.mock('@/components/reader/reader-runtime', () => ({
  openArticleUrl: (url: string) => openArticleUrl(url),
  openSupportPage: vi.fn(),
}));

describe('ReaderLayout', () => {
  beforeEach(() => {
    loadArticles.mockClear();
    loadUnreadCount.mockClear();
    goNext.mockClear();
    goPrev.mockClear();
    markRead.mockClear();
    starArticle.mockClear();
    setActiveArticle.mockClear();
    openArticleUrl.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it('loads inbox and handles keyboard shortcuts', () => {
    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <ReaderLayout view="inbox" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('reader-layout').className).toContain('h-screen');
    expect(loadArticles).toHaveBeenCalledWith({ view: 'inbox', showUnreadOnly: false });
    expect(loadUnreadCount).toHaveBeenCalled();
    expect(screen.getByText('7')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'j' });
    expect(goNext).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'k' });
    expect(goPrev).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'm' });
    expect(markRead).toHaveBeenCalledWith('a1');
    fireEvent.keyDown(window, { key: 's' });
    expect(starArticle).toHaveBeenCalledWith('a1', true);
    fireEvent.keyDown(window, { key: 'v' });
    expect(openArticleUrl).toHaveBeenCalledWith('https://example.com/post');
    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByTestId('reader-layout').getAttribute('data-focus-mode')).toBe('true');
    expect(window.localStorage.getItem('fluxfeed:reader-layout:v1')).toBe('{"focusMode":true}');

    const input = screen.getByPlaceholderText('Search articles...');
    fireEvent.keyDown(input, { key: 'j' });
    expect(goNext).toHaveBeenCalledTimes(1);
  });

  it('opens responsive navigation and closes it with Escape', () => {
    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <ReaderLayout view="inbox" />
      </MemoryRouter>,
    );

    const layout = screen.getByTestId('reader-layout');
    fireEvent.click(screen.getAllByLabelText('Open navigation')[0]);
    expect(layout.getAttribute('data-navigation-open')).toBe('true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(layout.getAttribute('data-navigation-open')).toBe('false');
  });

  it('restores the persisted focus preference', () => {
    window.localStorage.setItem('fluxfeed:reader-layout:v1', '{"focusMode":true}');

    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <ReaderLayout view="inbox" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('reader-layout').getAttribute('data-focus-mode')).toBe('true');
    expect(screen.getByLabelText('Exit focus mode')).not.toBeNull();
  });

  it('loads folder view from route params', () => {
    render(
      <MemoryRouter initialEntries={['/folder/Technology']}>
        <Routes>
          <Route path="/folder/:name" element={<ReaderLayout view="folder" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(loadArticles).toHaveBeenCalledWith({ view: 'folder', folder: 'Technology', showUnreadOnly: false });
  });

  it('loads feed view from route params', () => {
    render(
      <MemoryRouter initialEntries={['/feed/feed-1']}>
        <Routes>
          <Route path="/feed/:feedId" element={<ReaderLayout view="feed" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(loadArticles).toHaveBeenCalledWith({ view: 'feed', feedId: 'feed-1', showUnreadOnly: false });
  });

  it('loads all articles and selects article from article route', () => {
    render(
      <MemoryRouter initialEntries={['/article/feed%3A1%3Ahttps%3A%2F%2Fexample.com%2Fpost']}>
        <Routes>
          <Route path="/article/:articleId" element={<ReaderLayout view="all" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(loadArticles).toHaveBeenCalledWith({ view: 'all', showUnreadOnly: false });
    expect(setActiveArticle).toHaveBeenCalledWith('feed:1:https://example.com/post');
  });
});
