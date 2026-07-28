import { describe, expect, it, vi } from 'vitest';
import { createGroupStore } from '@/store/groupStore';

describe('group store', () => {
  it('loads groups and creates a child group', async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { groups: [{ id: 'group-1', name: 'Technology', order: 1, createdAt: 1 }] },
        })
        .mockResolvedValueOnce({ success: true, data: { group: { id: 'group-2' } } })
        .mockResolvedValueOnce({
          success: true,
          data: {
            groups: [
              { id: 'group-1', name: 'Technology', order: 1, createdAt: 1 },
              { id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 },
            ],
          },
        }),
    };
    const store = createGroupStore(client);

    await store.getState().loadGroups();
    await store.getState().createGroup('Frontend', 'group-1');

    expect(client.send).toHaveBeenNthCalledWith(1, { action: 'GROUP_LIST' });
    expect(client.send).toHaveBeenNthCalledWith(2, {
      action: 'GROUP_CREATE',
      payload: { name: 'Frontend', parentId: 'group-1' },
    });
    expect(store.getState().groups).toHaveLength(2);
  });

  it('deletes a group and reloads groups', async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({
          success: true,
          data: { groups: [{ id: 'group-2', name: 'Frontend', order: 2, createdAt: 2 }] },
        }),
    };
    const store = createGroupStore(client);

    const response = await store.getState().deleteGroup('group-1');

    expect(response.success).toBe(true);
    expect(client.send).toHaveBeenNthCalledWith(1, {
      action: 'GROUP_DELETE',
      payload: { groupId: 'group-1' },
    });
    expect(client.send).toHaveBeenNthCalledWith(2, { action: 'GROUP_LIST' });
    expect(store.getState().groups).toMatchObject([{ id: 'group-2' }]);
  });

  it('moves a tree node and reloads groups', async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, data: { groups: [] } }),
    };
    const store = createGroupStore(client);

    const response = await store.getState().moveTreeNode({
      nodeType: 'folder',
      nodeId: 'group-1',
      parentId: null,
      index: 0,
    });

    expect(response.success).toBe(true);
    expect(client.send).toHaveBeenNthCalledWith(1, {
      action: 'TREE_MOVE',
      payload: {
        nodeType: 'folder',
        nodeId: 'group-1',
        parentId: null,
        index: 0,
      },
    });
    expect(client.send).toHaveBeenNthCalledWith(2, { action: 'GROUP_LIST' });
  });
});
