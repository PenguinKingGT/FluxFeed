import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Feed, Group } from '@/lib/types';
import { Sidebar } from '@/components/reader/Sidebar';

const addFeed = vi.fn();
const loadFeeds = vi.fn();
const loadArticles = vi.fn();
const createGroup = vi.fn();
const deleteGroup = vi.fn();
const removeFeed = vi.fn();
const moveTreeNode = vi.fn();
const openSupportPage = vi.fn();

vi.mock('@/components/reader/reader-runtime', () => ({
  openSupportPage: () => openSupportPage(),
}));

vi.mock('@/store', () => ({
  useArticleStore: (selector: any) => selector({ loadArticles }),
}));

function feed(patch: Partial<Feed> = {}): Feed {
  return {
    id: 'f1',
    url: 'https://example.com/rss.xml',
    title: 'Example',
    description: '',
    siteUrl: 'https://example.com',
    iconUrl: '',
    refreshInterval: 30,
    errorCount: 0,
    createdAt: 1,
    ...patch,
  };
}

function group(patch: Partial<Group> = {}): Group {
  return {
    id: 'group-1',
    name: 'Technology',
    order: 1,
    createdAt: 1,
    ...patch,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe('Reader Sidebar', () => {
  beforeEach(() => {
    addFeed.mockReset().mockResolvedValue({ success: true });
    createGroup.mockReset().mockResolvedValue({ success: true });
    deleteGroup.mockReset().mockResolvedValue({ success: true });
    removeFeed.mockReset().mockResolvedValue({ success: true });
    moveTreeNode.mockReset().mockResolvedValue({ success: true });
    loadFeeds.mockClear();
    loadArticles.mockClear();
    openSupportPage.mockClear();
  });

  afterEach(() => cleanup());

  it('renders template navigation and active inbox style', () => {
    render(
      <MemoryRouter>
        <Sidebar currentView="inbox" feeds={[feed({ groupId: 'group-1' })]} groups={[group()]} unreadCount={12} addFeed={addFeed} loadFeeds={loadFeeds} createGroup={createGroup} deleteGroup={deleteGroup} removeFeed={removeFeed} moveTreeNode={moveTreeNode} />
      </MemoryRouter>,
    );

    expect(screen.getByText('FluxFeed')).not.toBeNull();
    expect(screen.getByAltText('FluxFeed')).not.toBeNull();
    expect(screen.getByText('Feed Reader')).not.toBeNull();
    expect(screen.getByText('Inbox')).not.toBeNull();
    expect(screen.getByText('Starred')).not.toBeNull();
    expect(screen.getByText('All Articles')).not.toBeNull();
    expect(screen.getByText('Folders')).not.toBeNull();
    expect(screen.getAllByText('Technology')).toHaveLength(1);
    expect(screen.getByText('12')).not.toBeNull();
    expect(screen.getByText('Inbox').closest('button')?.className).toContain('bg-sidebar-primary');
    expect(screen.getByText('Example')).not.toBeNull();
    expect(screen.queryByText('1')).toBeNull();
    const treeRow = document.querySelector<HTMLElement>('[role="treeitem"]');
    expect(treeRow?.style.minWidth).toBe('0px');
    expect(treeRow?.style.width).toBe('100%');
    expect(treeRow?.className).toContain('overflow-hidden');
    expect(screen.getByTestId('tree-node-folder:group-1').style.paddingLeft).toBe('16px');
  });

  it('expands folders, creates child folders, and opens feeds by feed route', async () => {
    const prompt = vi.spyOn(window, 'prompt');

    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <Sidebar currentView="feed" activeFeedId="f1" feeds={[feed({ groupId: 'group-2' })]} groups={[group(), group({ id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 })]} unreadCount={0} addFeed={addFeed} loadFeeds={loadFeeds} createGroup={createGroup} deleteGroup={deleteGroup} removeFeed={removeFeed} moveTreeNode={moveTreeNode} />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Create folder'));
    fireEvent.change(screen.getByLabelText('Folder name'), { target: { value: 'Design' } });
    fireEvent.click(screen.getByText('Create folder', { selector: 'button' }));
    await waitFor(() => expect(createGroup).toHaveBeenNthCalledWith(1, 'Design', undefined));

    fireEvent.click(screen.getByLabelText('Create subfolder in Technology'));
    fireEvent.change(screen.getByLabelText('Folder name'), { target: { value: 'Frontend' } });
    fireEvent.click(screen.getByText('Create folder', { selector: 'button' }));
    await waitFor(() => expect(createGroup).toHaveBeenNthCalledWith(2, 'Frontend', 'group-1'));

    expect(prompt).not.toHaveBeenCalled();
    expect(screen.getByText('Frontend')).not.toBeNull();
    expect(screen.queryByText('1')).toBeNull();

    fireEvent.click(screen.getByText('Technology'));
    expect(screen.getByTestId('location').textContent).toBe('/inbox');
    expect(screen.queryByText('Frontend')).toBeNull();

    fireEvent.click(screen.getByText('Technology'));
    fireEvent.click(screen.getByText('Example'));
    expect(screen.getByTestId('location').textContent).toBe('/feed/f1');

    prompt.mockRestore();
  });

  it('does not apply hover background to active settings item', () => {
    render(
      <MemoryRouter>
        <Sidebar currentView="settings" feeds={[]} groups={[]} unreadCount={0} addFeed={addFeed} loadFeeds={loadFeeds} createGroup={createGroup} deleteGroup={deleteGroup} removeFeed={removeFeed} moveTreeNode={moveTreeNode} />
      </MemoryRouter>,
    );

    const settingsClassName = screen.getByText('Settings').closest('button')?.className;

    expect(settingsClassName).toContain('bg-sidebar-primary');
    expect(settingsClassName).not.toContain('hover:bg-sidebar-accent');
  });

  it('opens support and adds feed through modal', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Sidebar currentView="all" feeds={[]} groups={[group(), group({ id: 'group-2', name: 'Design', parentId: 'group-1', order: 2, createdAt: 2 })]} unreadCount={0} addFeed={addFeed} loadFeeds={loadFeeds} createGroup={createGroup} deleteGroup={deleteGroup} removeFeed={removeFeed} moveTreeNode={moveTreeNode} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Support'));
    expect(openSupportPage).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Add Feed'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/feed.xml'), {
      target: { value: 'https://example.com/feed.xml' },
    });
    await user.click(screen.getByRole('combobox', { name: 'Folder' }));
    await user.click(screen.getByRole('option', { name: '— Design' }));
    fireEvent.click(screen.getByText('Subscribe'));

    await waitFor(() => expect(addFeed).toHaveBeenCalledWith('https://example.com/feed.xml', 'group-2'));
    expect(loadFeeds).toHaveBeenCalled();
    expect(loadArticles).toHaveBeenCalledWith({ view: 'inbox', showUnreadOnly: true });
  });

  it('confirms recursive root folder deletion', async () => {
    render(
      <MemoryRouter>
        <Sidebar
          currentView="all"
          feeds={[feed({ groupId: 'group-1' })]}
          groups={[group(), group({ id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 })]}
          unreadCount={0}
          addFeed={addFeed}
          loadFeeds={loadFeeds}
          createGroup={createGroup}
          deleteGroup={deleteGroup}
          removeFeed={removeFeed}
          moveTreeNode={moveTreeNode}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Delete folder Technology'));

    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText('Delete “Technology”?')).not.toBeNull();
    expect(screen.getByText('This permanently deletes this folder, all nested folders, every feed inside them, and all associated articles.')).not.toBeNull();
    expect(screen.getByText('This action cannot be undone.')).not.toBeNull();
    expect(screen.queryByText('No direct feeds will be moved.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Delete folder' }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('group-1'));
    expect(loadFeeds).toHaveBeenCalled();
  });

  it('deletes a feed and its articles after confirmation', async () => {
    render(
      <MemoryRouter initialEntries={['/feed/f1']}>
        <Sidebar
          currentView="feed"
          activeFeedId="f1"
          feeds={[feed()]}
          groups={[]}
          unreadCount={0}
          addFeed={addFeed}
          loadFeeds={loadFeeds}
          createGroup={createGroup}
          deleteGroup={deleteGroup}
          removeFeed={removeFeed}
          moveTreeNode={moveTreeNode}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Delete feed Example'));

    expect(screen.getByText('This permanently deletes this feed and all associated articles.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete feed' }));

    await waitFor(() => expect(removeFeed).toHaveBeenCalledWith('f1'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/inbox'));
  });

  it('wraps long folder names inside the delete dialog', () => {
    const longFolderName = 'https://devblogs.microsoft.com/landing';

    render(
      <MemoryRouter>
        <Sidebar
          currentView="all"
          feeds={[]}
          groups={[group({ name: longFolderName })]}
          unreadCount={0}
          addFeed={addFeed}
          loadFeeds={loadFeeds}
          createGroup={createGroup}
          deleteGroup={deleteGroup}
          removeFeed={removeFeed}
          moveTreeNode={moveTreeNode}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText(`Delete folder ${longFolderName}`));

    const title = screen.getByText(`Delete “${longFolderName}”?`);
    expect(title.className).toContain('break-all');
    expect(title.parentElement?.className).toContain('min-w-0');
  });
});
