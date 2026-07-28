import { browser } from 'wxt/browser';
import type { DetectedFeed } from './content-detector';

interface ActiveTabFeedRuntime {
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>>;
    sendMessage(tabId: number, message: { type: 'DETECT_FEEDS_NOW' }): Promise<unknown>;
  };
  scripting?: {
    executeScript(options: {
      target: { tabId: number };
      func: () => DetectionResponse;
    }): Promise<Array<{ result?: DetectionResponse }>>;
  };
}

interface DetectionResponse {
  feeds?: DetectedFeed[];
}

export function scanPageDom(): DetectionResponse {
  const feedTypes = new Set([
    'application/rss+xml',
    'application/atom+xml',
    'application/feed+json',
    'application/json',
  ]);
  const rssKeywords = /\brss\b|\bfeed\b|\batom\b/i;
  const toAbsoluteUrl = (url: string) => new URL(url, window.location.href).href;
  const linkFeeds = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="alternate"][href]'))
    .filter((link) => feedTypes.has(link.type.toLowerCase()))
    .map((link) => ({
      url: toAbsoluteUrl(link.getAttribute('href') ?? link.href),
      title: link.title || document.title,
      type: link.type,
    }));
  const feeds = linkFeeds.length > 0
    ? linkFeeds
    : Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .filter((anchor) => rssKeywords.test(anchor.textContent ?? '') || rssKeywords.test(anchor.href))
      .slice(0, 3)
      .map((anchor) => ({
        url: toAbsoluteUrl(anchor.getAttribute('href') ?? anchor.href),
        title: anchor.textContent?.trim() || anchor.href,
      }));

  return { feeds };
}

export async function scanCurrentTabForFeeds(
  runtime: ActiveTabFeedRuntime = browser as ActiveTabFeedRuntime,
): Promise<DetectedFeed[] | null> {
  if (!runtime?.tabs?.query || !runtime.tabs.sendMessage) {
    return null;
  }

  const [activeTab] = await runtime.tabs.query({ active: true, currentWindow: true });

  if (activeTab?.id === undefined) {
    return null;
  }

  try {
    const response = await runtime.tabs.sendMessage(activeTab.id, { type: 'DETECT_FEEDS_NOW' }) as DetectionResponse | undefined;
    console.log('Received response from content script:', response);
    if (Array.isArray(response?.feeds)) {
      return response.feeds;
    }
  } catch {
    // Fall through to DOM injection when the content script cannot answer.
  }

  if (!runtime.scripting?.executeScript) {
    return null;
  }

  try {
    const [injection] = await runtime.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: scanPageDom,
    });
    return Array.isArray(injection?.result?.feeds) ? injection.result.feeds : [];
  } catch {
    return null;
  }
}
