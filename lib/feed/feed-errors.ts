export type FeedFetchErrorCode =
  | 'FEED_TIMEOUT'
  | 'FEED_RESPONSE_TOO_LARGE'
  | 'FEED_DISCOVERY_LOOP'
  | 'FEED_DISCOVERY_LIMIT'
  | 'FEED_INVALID_URL';

/** Carries a stable, credential-free error across the background message boundary. */
export class FeedFetchError extends Error {
  constructor(code: FeedFetchErrorCode) {
    super(code);
    this.name = 'FeedFetchError';
  }
}

const TRANSLATION_KEYS: ReadonlyMap<string, string> = new Map([
  ['FEED_TIMEOUT', 'feed.fetchTimeout'],
  ['FEED_RESPONSE_TOO_LARGE', 'feed.responseTooLarge'],
  ['FEED_DISCOVERY_LOOP', 'feed.discoveryLoop'],
  ['FEED_DISCOVERY_LIMIT', 'feed.discoveryLimit'],
  ['FEED_INVALID_URL', 'creation.invalidUrl'],
]);

/** Resolves known failures at the UI boundary while retaining existing HTTP/network error fallback. */
export function getFeedErrorTranslationKey(error?: string): string | undefined {
  return error ? TRANSLATION_KEYS.get(error) : undefined;
}
