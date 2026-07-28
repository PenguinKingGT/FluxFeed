import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { scanCurrentTabForFeeds } from '@/lib/content/active-tab-feed-detector';
import type { DetectedFeed } from '@/lib/content/content-detector';
import { messageClient, type StoreMessageClient } from './message-client';

interface DetectedFeedState {
  detectedFeeds: DetectedFeed[];
  check(): Promise<void>;
}

export function createDetectedFeedStore(
  client: StoreMessageClient,
  scanCurrentTab: () => Promise<DetectedFeed[] | null> = scanCurrentTabForFeeds,
) {
  return createStore<DetectedFeedState>((set) => ({
    detectedFeeds: [],

    async check() {
      const currentPageFeeds = await scanCurrentTab();
      if (currentPageFeeds !== null) {
        set({ detectedFeeds: currentPageFeeds });
        return;
      }

      const response = await client.send<{ feeds: DetectedFeed[] } | null>({
        type: 'GET_DETECTED_FEEDS',
      });
      set({ detectedFeeds: response.data?.feeds ?? [] });
    },
  }));
}

export const detectedFeedStore = createDetectedFeedStore(messageClient);
export function useDetectedFeedStore<T>(selector: (state: DetectedFeedState) => T): T {
  return useStore(detectedFeedStore, selector);
}
