import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddContentDialog } from '@/components/reader/AddContentDialog';
import type { Group, MessageResponse } from '@/lib/types';

const { loadArticles } = vi.hoisted(() => ({ loadArticles: vi.fn() }));
vi.mock('@/store', () => ({
  useArticleStore: (selector: (state: { loadArticles: typeof loadArticles }) => unknown) => selector({ loadArticles }),
}));

const addFeed = vi.fn();
const createGroup = vi.fn();
const loadFeeds = vi.fn();
const onClose = vi.fn();
const onRestoreFocus = vi.fn();
const groups: Group[] = [
  { id: 'tech', name: 'Technology', order: 1, createdAt: 1 },
  { id: 'web', name: 'Web', parentId: 'tech', order: 1, createdAt: 1 },
];

/** Renders the public creation flow with observable background-backed callbacks. */
function renderDialog(initialMode: 'feed' | 'folder' = 'feed', initialGroupId?: string) {
  return render(
    <AddContentDialog
      initialMode={initialMode}
      initialGroupId={initialGroupId}
      groups={groups}
      addFeed={addFeed}
      createGroup={createGroup}
      loadFeeds={loadFeeds}
      onClose={onClose}
      onRestoreFocus={onRestoreFocus}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  addFeed.mockResolvedValue({ success: true });
  createGroup.mockResolvedValue({ success: true, data: { group: { id: 'new' } } });
  loadFeeds.mockResolvedValue(undefined);
  loadArticles.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('unified content creation', () => {
  it('shows only the selected task without explanatory sections or mode switching', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Add feed' })).toBeTruthy();
    expect(screen.getByLabelText('Feed URL')).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByLabelText('Folder name')).toBeNull();
    expect(screen.queryByText('Saved in this browser')).toBeNull();
  });

  it('adds a feed into the contextual folder selected by the plus menu', async () => {
    renderDialog('feed', 'web');
    expect(screen.getByRole('combobox', { name: 'Folder' }).textContent).toContain('Technology / Web');
    fireEvent.change(screen.getByLabelText('Feed URL'), { target: { value: 'https://example.com/feed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(addFeed).toHaveBeenCalledWith('https://example.com/feed', 'web'));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('offers only legal parents for new folders and submits through Enter', async () => {
    const user = userEvent.setup();
    renderDialog('folder', 'web');
    const parent = screen.getByRole('combobox', { name: 'Parent folder' });
    expect(parent.textContent).toContain('Technology');
    await user.click(parent);
    expect(screen.queryByRole('option', { name: 'Technology / Web' })).toBeNull();
    await user.click(screen.getByRole('option', { name: 'Technology' }));
    await user.type(screen.getByLabelText('Folder name'), 'Reading{Enter}');
    await waitFor(() => expect(createGroup).toHaveBeenCalledWith('Reading', 'tech'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('rejects unsupported URL protocols without making a request', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Feed URL'), { target: { value: 'file:///private/feed.xml' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(screen.getByRole('alert').textContent).toContain('http:// or https://');
    expect(addFeed).not.toHaveBeenCalled();
  });

  it('blocks dismissal while saving, retains failed input, and supports retry', async () => {
    let finish: (result: MessageResponse) => void = () => {};
    addFeed.mockReturnValueOnce(new Promise<MessageResponse>((resolve) => {
      finish = resolve;
    }));
    const user = userEvent.setup();
    renderDialog();
    fireEvent.change(screen.getByLabelText('Feed URL'), { target: { value: 'https://example.com/feed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(addFeed).toHaveBeenCalledOnce();
    finish({ success: false, error: 'Network offline' });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Network offline'));
    expect((screen.getByLabelText('Feed URL') as HTMLInputElement).value).toBe('https://example.com/feed');
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(addFeed).toHaveBeenCalledTimes(2);
  });

  it('recovers after an unexpected rejected creation request', async () => {
    createGroup.mockRejectedValueOnce(new Error('Unexpected failure'));
    renderDialog('folder');
    fireEvent.change(screen.getByLabelText('Folder name'), { target: { value: 'Reading' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create folder' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Failed to create folder'));
    expect((screen.getByRole('button', { name: 'Create folder' }) as HTMLButtonElement).disabled).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
