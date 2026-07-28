import { fetchFeed } from './feed-fetcher';

export interface ValidateFeedUrlResult {
  valid: boolean;
  resolvedUrl?: string;
  feedTitle?: string;
  error?: string;
}

export async function validateFeedUrl(
  input: string,
  fetcher?: typeof fetch,
): Promise<ValidateFeedUrlResult> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL',
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Only http and https URLs are supported',
    };
  }

  const result = await fetchFeed(url.href, fetcher);

  if (!result.success || !result.feed) {
    return {
      valid: false,
      resolvedUrl: result.resolvedUrl,
      error: result.error ?? 'Feed validation failed',
    };
  }

  return {
    valid: true,
    resolvedUrl: result.resolvedUrl ?? url.href,
    feedTitle: result.feed.title,
  };
}
