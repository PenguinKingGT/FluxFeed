import { describe, expect, it } from 'vitest';

import { discoverFeedLinks } from '@/lib/feed/discover-feed-links';

describe('discoverFeedLinks', () => {
  it('discovers rss, atom, and json feed links in order', () => {
    const links = discoverFeedLinks(`
      <html><head>
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml">
        <link rel="alternate" type="application/atom+xml" title="Atom" href="https://example.com/atom.xml">
        <link rel="alternate" type="application/feed+json" title="JSON" href="/feed.json">
      </head></html>
    `, 'https://example.com/blog');

    expect(links).toEqual([
      { title: 'RSS', url: 'https://example.com/rss.xml', type: 'rss' },
      { title: 'Atom', url: 'https://example.com/atom.xml', type: 'atom' },
      { title: 'JSON', url: 'https://example.com/feed.json', type: 'json' },
    ]);
  });
});
