import type { ParsedFeed } from '@/lib/types';
import { parseFeed } from '@/lib/parser';
import { discoverFeedLinks } from './discover-feed-links';
import { FeedFetchError } from './feed-errors';
import { cancelFeedBody, checkFeedDeadline, readFeedResponse } from './read-feed-response';

export const FEED_FETCH_TIMEOUT_MS = 30000;
export const MAX_FEED_DISCOVERY_HOPS = 5;

export interface FetchFeedResult {
  success: boolean;
  feed?: ParsedFeed;
  error?: string;
  statusCode?: number;
  resolvedUrl?: string;
}

const ACCEPT_HEADER = [
  'application/rss+xml',
  'application/atom+xml',
  'application/feed+json',
  'application/json',
  'application/xml',
  'text/xml',
  '*/*',
].join(', ');

/** Canonicalizes request and visited URLs; fragments never identify distinct network resources. */
function normalizeRequestUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new FeedFetchError('FEED_INVALID_URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new FeedFetchError('FEED_INVALID_URL');
  }
  url.hash = '';
  return url.href;
}

/** Fetches a feed within one deadline, response byte budget, and bounded HTML discovery chain. */
export async function fetchFeed(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<FetchFeedResult> {
  const controller = new AbortController();
  const deadline = Date.now() + FEED_FETCH_TIMEOUT_MS;
  let resolvedUrl = url;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new FeedFetchError('FEED_TIMEOUT'));
    }, FEED_FETCH_TIMEOUT_MS);
  });

  /** Shares request state across discovery steps rather than recursively resetting the budget. */
  async function followDiscovery(): Promise<FetchFeedResult> {
    const visited = new Set<string>();
    let currentUrl = url;
    let hops = 0;
    while (true) {
      checkFeedDeadline(controller.signal, deadline);
      currentUrl = normalizeRequestUrl(currentUrl);
      resolvedUrl = currentUrl;
      if (visited.has(currentUrl)) {
        throw new FeedFetchError('FEED_DISCOVERY_LOOP');
      }
      visited.add(currentUrl);
      const response = await fetcher(currentUrl, {
        headers: { Accept: ACCEPT_HEADER },
        signal: controller.signal,
      });

      try {
        checkFeedDeadline(controller.signal, deadline);
        // Native fetch follows redirects; resolve relative discovery links against the final address.
        resolvedUrl = normalizeRequestUrl(response.url || currentUrl);
        if (resolvedUrl !== currentUrl && visited.has(resolvedUrl)) {
          throw new FeedFetchError('FEED_DISCOVERY_LOOP');
        }
        visited.add(resolvedUrl);
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}`,
            statusCode: response.status,
            resolvedUrl,
          };
        }
        const text = await readFeedResponse(response, controller.signal, deadline);
        checkFeedDeadline(controller.signal, deadline);
        const contentType = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
        if (contentType === 'text/html' || contentType === 'application/xhtml+xml') {
          const [firstFeedLink] = discoverFeedLinks(text, resolvedUrl);
          if (!firstFeedLink) {
            return { success: false, error: 'Not a valid RSS/Atom/JSON feed', resolvedUrl };
          }
          if (hops >= MAX_FEED_DISCOVERY_HOPS) {
            throw new FeedFetchError('FEED_DISCOVERY_LIMIT');
          }
          currentUrl = firstFeedLink.url;
          hops += 1;
          continue;
        }
        const feed = parseFeed(text);
        checkFeedDeadline(controller.signal, deadline);
        return {
          success: true,
          feed,
          resolvedUrl,
        };
      } finally {
        cancelFeedBody(response);
      }
    }
  }

  try {
    // The outer race also bounds adapters that fail to honor AbortSignal.
    return await Promise.race([followDiscovery(), timedOut]);
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (controller.signal.aborted) {
      message = 'FEED_TIMEOUT';
    }
    return {
      success: false,
      error: message,
      resolvedUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}
