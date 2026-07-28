import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Feed, MessageResponse } from '@/lib/types';
import { messageClient, type StoreMessageClient } from './message-client';

interface FeedState {
  feeds: Feed[];
  isLoading: boolean;
  error: string | null;
  loadFeeds(): Promise<void>;
  addFeed(url: string, groupId?: string): Promise<MessageResponse>;
  removeFeed(feedId: string): Promise<MessageResponse>;
  refreshFeed(feedId?: string): Promise<void>;
}

export function createFeedStore(client: StoreMessageClient) {
  return createStore<FeedState>((set, get) => ({
    feeds: [],
    isLoading: false,
    error: null,

    async loadFeeds() {
      set({ isLoading: true, error: null });
      const response = await client.send<{ feeds: Feed[] }>({ action: 'FEED_LIST' });
      if (response.success) {
        set({ feeds: response.data?.feeds ?? [], isLoading: false });
      } else {
        set({ error: response.error ?? 'Failed to load feeds', isLoading: false });
      }
    },

    async addFeed(url, groupId) {
      set({ isLoading: true, error: null });
      const response = await client.send({ type: 'ADD_FEED', url, groupId });
      if (response.success) {
        await get().loadFeeds();
      } else {
        set({ error: response.error ?? 'Failed to add feed', isLoading: false });
      }
      return response;
    },

    async removeFeed(feedId) {
      const response = await client.send({ type: 'REMOVE_FEED', feedId });
      if (response.success) {
        set((state) => ({ feeds: state.feeds.filter((feed) => feed.id !== feedId) }));
      } else {
        set({ error: response.error ?? 'Failed to remove feed' });
      }
      return response;
    },

    async refreshFeed(feedId) {
      set({ isLoading: true, error: null });
      const response = await client.send({ type: 'FETCH_NOW', feedId });
      if (response.success) {
        await get().loadFeeds();
      } else {
        set({ error: response.error ?? 'Failed to refresh feed', isLoading: false });
      }
    },
  }));
}

export const feedStore = createFeedStore(messageClient);
export function useFeedStore<T>(selector: (state: FeedState) => T): T {
  return useStore(feedStore, selector);
}
