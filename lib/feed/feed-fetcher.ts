import type { ParsedFeed } from '@/lib/types';
import { parseFeed } from '@/lib/parser';
import { discoverFeedLinks } from './discover-feed-links';

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

export async function fetchFeed(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<FetchFeedResult> {
  try {
    const response = await fetcher(url, {
      headers: {
        Accept: ACCEPT_HEADER,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        statusCode: response.status,
        resolvedUrl: url,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();

    if (contentType.includes('text/html')) {
      const [firstFeedLink] = discoverFeedLinks(text, url);

      if (!firstFeedLink) {
        return {
          success: false,
          error: 'Not a valid RSS/Atom/JSON feed',
          resolvedUrl: url,
        };
      }

      return fetchFeed(firstFeedLink.url, fetcher);
    }

    return {
      success: true,
      feed: parseFeed(text),
      resolvedUrl: url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      resolvedUrl: url,
    };
  }
}
