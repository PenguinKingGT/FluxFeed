import type { ParsedFeed } from '@/lib/types';
import { FeedParseError } from '@/lib/types';
import { parseAtomFeed } from './atom';
import { parseJsonFeed } from './json-feed';
import { parseRssFeed } from './rss';

export { parseAtomFeed } from './atom';
export { parseJsonFeed } from './json-feed';
export { parseRssFeed } from './rss';
export { FeedParseError } from '@/lib/types';

export function parseFeed(input: string): ParsedFeed {
  const content = input.trim();

  if (content.startsWith('{')) {
    return parseJsonFeed(content);
  }

  if (/<rss[\s>]/i.test(content)) {
    return parseRssFeed(content);
  }

  if (/<feed[\s>]/i.test(content)) {
    return parseAtomFeed(content);
  }

  throw new FeedParseError('Unknown feed format');
}
