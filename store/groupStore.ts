import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Group, MessageResponse, TreeNodeMove } from '@/lib/types';
import { messageClient, type StoreMessageClient } from './message-client';

interface GroupState {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  loadGroups(): Promise<void>;
  createGroup(name: string, parentId?: string): Promise<MessageResponse>;
  deleteGroup(groupId: string): Promise<MessageResponse>;
  moveTreeNode(move: TreeNodeMove): Promise<MessageResponse>;
}

export function createGroupStore(client: StoreMessageClient) {
  return createStore<GroupState>((set, get) => ({
    groups: [],
    isLoading: false,
    error: null,

    async loadGroups() {
      set({ isLoading: true, error: null });
      const response = await client.send<{ groups: Group[] }>({ action: 'GROUP_LIST' });
      if (response.success) {
        set({ groups: response.data?.groups ?? [], isLoading: false });
      } else {
        set({ error: response.error ?? 'Failed to load groups', isLoading: false });
      }
    },

    async createGroup(name, parentId) {
      set({ isLoading: true, error: null });
      const response = await client.send({ action: 'GROUP_CREATE', payload: { name, parentId } });
      if (response.success) {
        await get().loadGroups();
      } else {
        set({ error: response.error ?? 'Failed to create group', isLoading: false });
      }
      return response;
    },

    async deleteGroup(groupId) {
      set({ isLoading: true, error: null });
      const response = await client.send({ action: 'GROUP_DELETE', payload: { groupId } });
      if (response.success) {
        await get().loadGroups();
      } else {
        set({ error: response.error ?? 'Failed to delete group', isLoading: false });
      }
      return response;
    },

    async moveTreeNode(move) {
      set({ isLoading: true, error: null });
      const response = await client.send({ action: 'TREE_MOVE', payload: move });
      if (response.success) {
        await get().loadGroups();
      } else {
        set({ error: response.error ?? 'Failed to move tree node', isLoading: false });
      }
      return response;
    },
  }));
}

export const groupStore = createGroupStore(messageClient);
export function useGroupStore<T>(selector: (state: GroupState) => T): T {
  return useStore(groupStore, selector);
}
