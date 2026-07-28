import { describe, expect, it } from 'vitest';

import { parseAtomFeed } from '@/lib/parser/atom';

describe('Atom parser', () => {
  it('maps Atom feed and entry fields to ParsedFeed', () => {
    const feed = parseAtomFeed(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Example Atom</title>
        <subtitle>Atom description</subtitle>
        <icon>/icon.png</icon>
        <link rel="alternate" href="https://example.com" />
        <entry>
          <id>tag:example.com,2024:1</id>
          <title>Atom article</title>
          <link href="https://example.com/atom-a" />
          <published>2024-01-02T00:00:00.000Z</published>
          <author><name>Ada</name></author>
          <summary>Atom summary</summary>
          <content><![CDATA[<p>Atom content</p>]]></content>
        </entry>
      </feed>
    `);

    expect(feed).toMatchObject({
      title: 'Example Atom',
      description: 'Atom description',
      siteUrl: 'https://example.com',
      iconUrl: '/icon.png',
    });
    expect(feed.articles[0]).toMatchObject({
      guid: 'tag:example.com,2024:1',
      title: 'Atom article',
      url: 'https://example.com/atom-a',
      author: 'Ada',
      content: '<p>Atom content</p>',
      publishedAt: Date.parse('2024-01-02T00:00:00.000Z'),
    });
  });

  it('uses updated and link fallback values', () => {
    const feed = parseAtomFeed(`
      <feed>
        <title>Fallback Atom</title>
        <link href="https://example.com" />
        <entry>
          <summary>Fallback summary for title</summary>
          <link href="https://example.com/fallback" />
          <updated>2024-01-03T00:00:00.000Z</updated>
        </entry>
      </feed>
    `);

    expect(feed.articles[0]).toMatchObject({
      guid: 'https://example.com/fallback',
      title: 'Fallback summary for title',
      url: 'https://example.com/fallback',
      publishedAt: Date.parse('2024-01-03T00:00:00.000Z'),
    });
  });
});
