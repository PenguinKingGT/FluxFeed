import { describe, expect, it, vi } from 'vitest';
import { handleBackgroundMessage } from '@/entrypoints/background/message-handler';

function createDependencies(storageService: Record<string, unknown>) {
  return {
    storageService: storageService as never,
    fetchFeed: vi.fn(),
    updateBadge: vi.fn(),
    refreshSingleFeed: vi.fn(),
    refreshAllFeeds: vi.fn(),
  };
}

describe('background state query messages', () => {
  it('returns articles with filter options', async () => {
    const articles = [{ id: 'article-1', feedId: 'feed-1', isRead: false }];
    const getArticles = vi.fn().mockResolvedValue(articles);

    const response = await handleBackgroundMessage(
      { action: 'ARTICLE_LIST', payload: { feedId: 'feed-1', onlyUnread: true } },
      createDependencies({ getArticles }),
    );

    expect(getArticles).toHaveBeenCalledWith({ feedId: 'feed-1', onlyUnread: true });
    expect(response).toEqual({ success: true, data: { articles } });
  });

  it('returns global settings', async () => {
    const settings = { id: 'global', theme: 'system', refreshInterval: 30 };
    const getSettings = vi.fn().mockResolvedValue(settings);

    const response = await handleBackgroundMessage(
      { action: 'SETTINGS_GET' },
      createDependencies({ getSettings }),
    );

    expect(response).toEqual({ success: true, data: { settings } });
  });

  it('lists and creates groups', async () => {
    const groups = [{ id: 'group-1', name: 'Technology', order: 1, createdAt: 1 }];
    const getGroups = vi.fn().mockResolvedValue(groups);
    const saveGroup = vi.fn();

    const listResponse = await handleBackgroundMessage(
      { action: 'GROUP_LIST' },
      createDependencies({ getGroups }),
    );
    const createResponse = await handleBackgroundMessage(
      { action: 'GROUP_CREATE', payload: { name: ' Design ', parentId: 'group-1' } },
      {
        ...createDependencies({ saveGroup }),
        now: () => 2000,
      },
    );

    expect(listResponse).toEqual({ success: true, data: { groups } });
    expect(saveGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        name: 'Design',
        parentId: 'group-1',
        order: 2000,
        createdAt: 2000,
      }),
    );
    expect(createResponse.success).toBe(true);
  });

  it('deletes a group', async () => {
    const removeGroup = vi.fn();

    const response = await handleBackgroundMessage(
      { action: 'GROUP_DELETE', payload: { groupId: 'group-1' } },
      createDependencies({ removeGroup }),
    );

    expect(removeGroup).toHaveBeenCalledWith('group-1');
    expect(response).toEqual({ success: true });
  });

  it('moves a tree node', async () => {
    const moveTreeNode = vi.fn();
    const payload = {
      nodeType: 'feed' as const,
      nodeId: 'feed-1',
      parentId: 'group-1',
      index: 2,
    };

    const response = await handleBackgroundMessage(
      { action: 'TREE_MOVE', payload },
      createDependencies({ moveTreeNode }),
    );

    expect(moveTreeNode).toHaveBeenCalledWith(payload);
    expect(response).toEqual({ success: true });
  });

  it('normalizes settings update payload fields', async () => {
    const saveSettings = vi.fn();

    const response = await handleBackgroundMessage(
      { type: 'SETTINGS_UPDATE', theme: 'dark', refreshInterval: 60 },
      createDependencies({ saveSettings }),
    );

    expect(saveSettings).toHaveBeenCalledWith({ theme: 'dark', refreshInterval: 60 });
    expect(response).toEqual({ success: true });
  });
});
