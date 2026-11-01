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

  it('decodes HTML attributes and handles case, rel tokens, and unquoted URLs', () => {
    expect(discoverFeedLinks(`
      <LINK REL="ALTERNATE stylesheet" TYPE="Application/RSS+XML" TITLE="News &amp; Notes"
        HREF="/rss.xml?category=tech&amp;lang=en">
      <link rel=alternate type=application/atom+xml href=../atom.xml>
      <link rel="alternate" type="application/feed+json; charset=utf-8" href="//feeds.example.com/feed.json">
    `, 'https://example.com/blog/')).toEqual([
      { title: 'News & Notes', url: 'https://example.com/rss.xml?category=tech&lang=en', type: 'rss' },
      { title: '', url: 'https://example.com/atom.xml', type: 'atom' },
      { title: '', url: 'https://feeds.example.com/feed.json', type: 'json' },
    ]);
  });

  it('ignores link-shaped text in comments, scripts, styles, and templates', () => {
    expect(discoverFeedLinks(`
      <!-- <link rel="alternate" type="application/rss+xml" href="/comment"> -->
      <script>const fake = '<link rel="alternate" type="application/rss+xml" href="/script">';</script>
      <style>/* <link rel="alternate" type="application/rss+xml" href="/style"> */</style>
      <template><div><link rel="alternate" type="application/rss+xml" href="/template"></div></template>
      <link rel="alternate" type="application/rss+xml" href="/real.xml">
    `, 'https://example.com/')).toEqual([
      { title: '', url: 'https://example.com/real.xml', type: 'rss' },
    ]);
  });

  it('skips invalid candidates without losing later valid links', () => {
    expect(discoverFeedLinks(`
      <link rel="alternate" type="application/rss+xml" href="http://[invalid">
      <link rel="alternate" type="application/rss+xml" href="javascript:alert(1)">
      <link rel="alternate" type="application/rss+xml" href="data:text/xml,feed">
      <link rel="alternate" type="application/rss+xml" href="file:///tmp/feed.xml">
      <link rel="alternate" type="application/rss+xml" href=" ">
      <link rel="alternate" type="__proto__" href="/unsupported">
      <link rel="stylesheet" type="application/rss+xml" href="/not-alternate">
      <link rel="alternate" type="application/rss+xml" href="/valid.xml">
    `, 'https://example.com/')).toEqual([
      { title: '', url: 'https://example.com/valid.xml', type: 'rss' },
    ]);
  });
});
