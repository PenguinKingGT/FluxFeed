import { describe, expect, it } from 'vitest';

import { parseRssFeed } from '@/lib/parser/rss';

describe('RSS 2.0 parser', () => {
  it('maps RSS channel and item fields to ParsedFeed', () => {
    const feed = parseRssFeed(`
      <rss version="2.0">
        <channel>
          <title>Example RSS</title>
          <description>RSS description</description>
          <link>https://example.com</link>
          <image><url>https://example.com/icon.png</url></image>
          <item>
            <guid>guid-1</guid>
            <title>Article title</title>
            <link>https://example.com/a</link>
            <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            <author>author@example.com</author>
            <description><![CDATA[<p>Summary</p>]]></description>
            <content:encoded><![CDATA[<p>Full content</p>]]></content:encoded>
          </item>
        </channel>
      </rss>
    `);

    expect(feed).toMatchObject({
      title: 'Example RSS',
      description: 'RSS description',
      siteUrl: 'https://example.com',
      iconUrl: 'https://example.com/icon.png',
    });
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0]).toMatchObject({
      guid: 'guid-1',
      title: 'Article title',
      url: 'https://example.com/a',
      author: 'author@example.com',
      summary: '<p>Summary</p>',
      content: '<p>Full content</p>',
    });
    expect(feed.articles[0]?.publishedAt).toBe(Date.parse('Mon, 01 Jan 2024 00:00:00 GMT'));
  });

  it('falls back when guid, title, and pubDate are missing or invalid', () => {
    const before = Date.now();
    const feed = parseRssFeed(`
      <rss version="2.0">
        <channel>
          <title>Fallback RSS</title>
          <link>https://example.com</link>
          <item>
            <link>https://example.com/fallback</link>
            <pubDate>not a date</pubDate>
            <description>Long fallback summary content for missing title</description>
          </item>
        </channel>
      </rss>
    `);
    const after = Date.now();

    expect(feed.articles[0]).toMatchObject({
      guid: 'https://example.com/fallback',
      title: 'Long fallback summary content for missing title',
      url: 'https://example.com/fallback',
    });
    expect(feed.articles[0]!.publishedAt).toBeGreaterThanOrEqual(before);
    expect(feed.articles[0]!.publishedAt).toBeLessThanOrEqual(after);
  });

  it('joins adjacent CDATA sections in RSS descriptions', () => {
    const feed = parseRssFeed(`
      <rss version="2.0">
        <channel>
          <title>Example RSS</title>
          <link>https://example.com</link>
          <item>
            <guid>guid-cdata</guid>
            <title>CDATA Article</title>
            <link>https://example.com/cdata</link>
            <description>
              <![CDATA[<p>Intro paragraph</p>]]>
              <![CDATA[<p>Full body paragraph</p><img src="https://example.com/a.webp" />]]>
            </description>
          </item>
        </channel>
      </rss>
    `);

    expect(feed.articles[0]?.content).toBe(
      '<p>Intro paragraph</p><p>Full body paragraph</p><img src="https://example.com/a.webp" />',
    );
    expect(feed.articles[0]?.summary).toBe('');
  });
});
