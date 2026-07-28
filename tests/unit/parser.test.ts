import { describe, expect, it } from 'vitest';

import { FeedParseError } from '@/lib/types';
import { parseFeed } from '@/lib/parser';

describe('parser entrypoint', () => {
  it('detects RSS input', () => {
    const feed = parseFeed('<rss><channel><title>RSS</title></channel></rss>');

    expect(feed.title).toBe('RSS');
  });

  it('detects Atom input', () => {
    const feed = parseFeed('<feed><title>Atom</title></feed>');

    expect(feed.title).toBe('Atom');
  });

  it('detects JSON Feed input', () => {
    const feed = parseFeed(JSON.stringify({ title: 'JSON', items: [] }));

    expect(feed.title).toBe('JSON');
  });

  it('throws FeedParseError for unknown input', () => {
    expect(() => parseFeed('not a feed')).toThrow(FeedParseError);
  });
});
