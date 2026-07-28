import { describe, expect, it } from 'vitest';
import type { Feed, Group } from '@/lib/types';
import { generateOPML } from '@/lib/opml/export-opml';
import { parseOPML, parseOPMLDocument } from '@/lib/opml/import-opml';

function feed(patch: Partial<Feed> = {}): Feed {
  return {
    id: 'feed-1',
    url: 'https://example.com/feed.xml',
    title: 'Example & "Blog"',
    description: '',
    siteUrl: 'https://example.com',
    iconUrl: '',
    refreshInterval: 60,
    errorCount: 0,
    createdAt: 1,
    ...patch,
  };
}

describe('OPML service', () => {
  it('parses unique http rss outline urls', () => {
    const xml = `
      <opml version="2.0"><body>
        <outline type="rss" xmlUrl="https://example.com/feed.xml" />
        <outline type="rss" xmlUrl="https://example.com/feed.xml" />
        <outline type="rss" xmlUrl="ftp://invalid.test/feed.xml" />
        <outline type="rss" />
        <outline xmlUrl="http://another.test/rss" />
      </body></opml>
    `;

    expect(parseOPML(xml)).toEqual(['https://example.com/feed.xml', 'http://another.test/rss']);
  });

  it('generates OPML 2.0 with escaped attributes', () => {
    const opml = generateOPML([feed()]);

    expect(opml).toContain('<?xml version="1.0"?>');
    expect(opml).toContain('<opml version="2.0">');
    expect(opml).toContain('type="rss"');
    expect(opml).toContain('xmlUrl="https://example.com/feed.xml"');
    expect(opml).toContain('htmlUrl="https://example.com"');
    expect(opml).toContain('Example &amp; &quot;Blog&quot;');
  });

  it('preserves two-level folder paths when parsing and exporting', () => {
    const groups: Group[] = [
      { id: 'group-1', name: 'Tech', order: 1, createdAt: 1 },
      { id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 1, createdAt: 2 },
    ];
    const opml = generateOPML([
      feed({ groupId: 'group-2' }),
    ], groups);

    expect(opml).toContain('<outline text="Tech" title="Tech">');
    expect(opml).toContain('<outline text="Frontend" title="Frontend">');
    expect(parseOPMLDocument(opml)).toEqual([
      {
        url: 'https://example.com/feed.xml',
        title: 'Example & "Blog"',
        groupPath: ['Tech', 'Frontend'],
      },
    ]);
  });

  it('rejects malformed OPML documents', () => {
    expect(() => parseOPMLDocument('<opml><body>')).toThrow('Invalid OPML document');
  });
});
