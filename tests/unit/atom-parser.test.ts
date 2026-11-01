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

  it.each([
    ['text', '2 &lt; 3 &amp; 4\nnext', '2 &lt; 3 &amp; 4<br>next'],
    ['html', '&lt;p&gt;HTML &amp;amp; body&lt;/p&gt;', '<p>HTML &amp; body</p>'],
  ])('handles explicit Atom %s bodies without double encoding', (type, source, expected) => {
    const feed = parseAtomFeed(`<feed><entry><content type="${type}">${source}</content></entry></feed>`);
    expect(feed.articles[0].content).toBe(expected);
  });

  it('retains ordered mixed XHTML, attributes, repeated elements and preformatted whitespace', () => {
    const feed = parseAtomFeed(`<feed><entry><summary>Short</summary><content type="xhtml">
      <div xmlns="http://www.w3.org/1999/xhtml"><p>Before <em>middle</em> after <a href="https://example.com?a=1&amp;b=2">link</a>.</p><p>Second &amp; last</p><pre> a\n  b</pre></div>
    </content></entry></feed>`);
    const container = document.createElement('div');
    container.innerHTML = feed.articles[0].content;
    expect(container.querySelector('p')?.textContent).toBe('Before middle after link.');
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com?a=1&b=2');
    expect(container.querySelector('pre')?.textContent).toBe(' a\n  b');
  });


  it('handles prefixed XHTML without mistaking media extensions for Atom content', () => {
    const feed = parseAtomFeed(`<feed xmlns:media="https://example.com/media"><entry>
      <media:content url="https://example.com/image.jpg"/>
      <content type="xhtml"><x:div xmlns:x="http://www.w3.org/1999/xhtml"><x:p>One <x:strong>bold</x:strong> &amp; two</x:p><x:br/><x:p>&amp;lt;literal&amp;gt;</x:p></x:div></content>
    </entry></feed>`);
    const container = document.createElement('div');
    container.innerHTML = feed.articles[0].content;
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('p')?.textContent).toBe('One bold & two');
    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.textContent).toContain('&lt;literal&gt;');
  });

  it('uses typed XHTML summary fallback and keeps untyped text literal', () => {
    const feed = parseAtomFeed(`<feed><entry><summary type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Summary <em>body</em></p></div></summary></entry>
      <entry><content>&lt;script&gt;literal&lt;/script&gt;</content></entry></feed>`);
    expect(feed.articles[0].content).toContain('<em>body</em>');
    expect(feed.articles[1].content).toBe('&lt;script&gt;literal&lt;/script&gt;');
  });

});
