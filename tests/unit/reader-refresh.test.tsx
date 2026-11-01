import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useStore } from 'zustand';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createArticleStore } from '@/store/articleStore';
import { createFeedStore } from '@/store/feedStore';
import { createRuntimeMessageClient } from '@/store/message-client';
import { DEFAULT_SETTINGS } from '@/lib/db/defaults';
import type { Article, Feed } from '@/lib/types';
import { ReaderLayout } from '@/components/reader/ReaderLayout';

// Hooks run only after beforeEach installs both stores; non-null assertions are limited to this harness.
const stores = vi.hoisted(() => ({
  article: null as ReturnType<typeof createArticleStore> | null,
  feed: null as ReturnType<typeof createFeedStore> | null,
}));
vi.mock('@/store', () => ({
  useArticleStore: (selector: (state: ReturnType<ReturnType<typeof createArticleStore>['getState']>) => unknown) => useStore(stores.article!, selector),
  useFeedStore: (selector: (state: ReturnType<ReturnType<typeof createFeedStore>['getState']>) => unknown) => useStore(stores.feed!, selector),
  useGroupStore: (selector: (state: object) => unknown) => selector({ groups: [], loadGroups: vi.fn() }),
  useSettingsStore: (selector: (state: object) => unknown) => selector({
    settings: { ...DEFAULT_SETTINGS, markReadOnOpen: false },
  }),
}));

const feed: Feed = {
  id: 'f1', title: 'Feed', url: 'https://example.com/rss', description: '',
  siteUrl: '', iconUrl: '', refreshInterval: 30, errorCount: 0, createdAt: 1,
};
/** Creates visible records without triggering automatic read mutations. */
function article(id: string): Article {
  return {
    id, feedId: feed.id, guid: id, title: `Matching ${id}`, url: `https://example.com/${id}`,
    author: '', summary: '', content: '<p>Body</p>', publishedAt: 1, fetchedAt: 1,
    isRead: false, isStarred: false, tags: [],
  };
}

let records: Article[];
let rejectRefresh: boolean;
const sendMessage = vi.fn();
beforeEach(() => {
  records = [article('old')];
  rejectRefresh = false;
  sendMessage.mockReset().mockImplementation(async (message) => {
    const action = 'action' in message ? message.action : message.type;
    if (action === 'FETCH_NOW') {
      if (rejectRefresh) {
        return { success: false, error: 'Network unavailable' };
      }
      records = [article('new'), article('old')];
      return { success: true, data: { count: 1 } };
    }
    if (action === 'ARTICLE_LIST') {
      return { success: true, data: { articles: records } };
    }
    if (action === 'GET_UNREAD_COUNT') {
      return { success: true, data: { count: records.length } };
    }
    return { success: true, data: { feeds: [feed] } };
  });
  const client = createRuntimeMessageClient({ sendMessage });
  stores.article = createArticleStore(client);
  stores.feed = createFeedStore(client);
  stores.feed.setState({ feeds: [feed] });
});
afterEach(cleanup);

/** Mounts the real layout, panel, and stores at their normal refresh boundary. */
function renderReader(view: 'all' | 'feed') {
  return render(
    <MemoryRouter initialEntries={[view === 'feed' ? '/feed/f1' : '/all']}>
      <Routes><Route path={view === 'feed' ? '/feed/:feedId' : '/all'} element={<ReaderLayout view={view} />} /></Routes>
    </MemoryRouter>,
  );
}

describe('reader refresh coordination', () => {
  it.each(['all', 'feed'] as const)('updates rows and unread counts in %s without losing search or selection', async (view) => {
    renderReader(view);
    fireEvent.click(await screen.findByRole('button', { name: /Matching old/ }));
    fireEvent.change(screen.getByLabelText('Search articles...'), { target: { value: 'Matching' } });
    await waitFor(() => expect(stores.article!.getState().filter.searchQuery).toBe('Matching'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh feeds' }));
    await screen.findByRole('button', { name: /Matching new/ });
    expect(stores.article!.getState().unreadCount).toBe(2);
    expect(stores.article!.getState().activeArticleId).toBe('old');
    expect(stores.article!.getState().filter).toMatchObject({ view, searchQuery: 'Matching' });
    expect(sendMessage).toHaveBeenCalledWith({ type: 'FETCH_NOW', feedId: view === 'feed' ? 'f1' : undefined });
  });

  it('shows refresh failures, releases loading and lets the user retry', async () => {
    renderReader('all');
    await screen.findByRole('button', { name: /Matching old/ });
    rejectRefresh = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh feeds' }));
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'Refresh feeds' }) as HTMLButtonElement).disabled).toBe(false);
    rejectRefresh = false;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh feeds' }));
    await screen.findByRole('button', { name: /Matching new/ });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the latest view/search during a pending refresh and clears only an invalid selection', async () => {
    renderReader('all');
    fireEvent.click(await screen.findByRole('button', { name: /Matching old/ }));
    let finish!: () => void;
    sendMessage.mockImplementationOnce(() => new Promise((resolve) => {
      finish = () => {
        records = [article('new')];
        resolve({ success: true });
      };
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh feeds' }));
    expect((screen.getByRole('button', { name: 'Refreshing feeds' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      await stores.article!.getState().loadArticles({ view: 'feed', feedId: 'f1', searchQuery: 'new' });
    });
    await act(async () => { finish(); });
    await screen.findByRole('button', { name: /Matching new/ });
    expect(stores.article!.getState().filter).toMatchObject({ view: 'feed', feedId: 'f1', searchQuery: 'new' });
    expect(stores.article!.getState().activeArticleId).toBeNull();
  });


  it('updates committed articles and counts even when the refresh is partially unsuccessful', async () => {
    renderReader('all');
    await screen.findByRole('button', { name: /Matching old/ });
    sendMessage.mockImplementationOnce(async () => {
      records = [article('new'), article('old')];
      return { success: false, error: 'FEED_REFRESH_FAILED', data: { count: 1, failedCount: 1 } };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh feeds' }));
    await screen.findByRole('button', { name: /Matching new/ });
    expect(screen.getByRole('alert').textContent).toBe("Couldn't refresh feeds. Please try again.");
    expect(stores.article!.getState().unreadCount).toBe(2);
  });

});
