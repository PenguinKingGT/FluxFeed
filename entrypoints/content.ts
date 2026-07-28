import { browser } from 'wxt/browser';
import type { DetectedFeed } from '@/lib/content/content-detector';
import { discoverFeeds } from '@/lib/content/content-detector';

interface RuntimeMessenger {
  sendMessage(message: unknown): Promise<unknown> | unknown;
}

interface PageMetadata {
  pageUrl: string;
  pageTitle: string;
}

export function detectCurrentPageFeeds(doc: Document, pageUrl: string) {
  return {
    feeds: discoverFeeds(doc, pageUrl),
    pageUrl,
    pageTitle: doc.title,
  };
}

const defineContentScriptForRuntime =
  typeof defineContentScript === 'function'
    ? defineContentScript
    : <TConfig>(config: TConfig): TConfig => config;

export async function notifyDetectedFeeds(
  runtime: RuntimeMessenger,
  feeds: DetectedFeed[],
  metadata: PageMetadata,
): Promise<void> {
  if (feeds.length === 0) {
    return;
  }

  await runtime.sendMessage({
    type: 'FEEDS_DETECTED',
    feeds,
    pageUrl: metadata.pageUrl,
    pageTitle: metadata.pageTitle,
  });
}

export default defineContentScriptForRuntime({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    const detect = () => detectCurrentPageFeeds(document, window.location.href);
    const initialDetection = detect();

    void notifyDetectedFeeds(browser.runtime, initialDetection.feeds, initialDetection);

    browser.runtime.onMessage.addListener(async (message: unknown) => {
      if ((message as { type?: string } | undefined)?.type !== 'DETECT_FEEDS_NOW') {
        return undefined;
      }

      return detect();
    });
  },
});
