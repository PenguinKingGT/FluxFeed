import { describe, expect, it } from 'vitest';

import { fetchFeed } from '@/lib/feed/feed-fetcher';

const rssXml = '<rss><channel><title>Fetched RSS</title></channel></rss>';

function createResponse(body: string, init: { status?: number; contentType?: string } = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'content-type': init.contentType ?? 'application/rss+xml',
    },
  });
}

describe('fetchFeed', () => {
  it('returns parsed feed for RSS responses', async () => {
    const result = await fetchFeed('https://example.com/rss.xml', async () => createResponse(rssXml));

    expect(result).toMatchObject({
      success: true,
      resolvedUrl: 'https://example.com/rss.xml',
      feed: { title: 'Fetched RSS' },
    });
  });

  it('returns status errors for non-2xx responses', async () => {
    const result = await fetchFeed('https://example.com/rss.xml', async () => createResponse('', { status: 404 }));

    expect(result).toMatchObject({
      success: false,
      statusCode: 404,
      error: 'HTTP 404',
    });
  });

  it('discovers and fetches the first feed from HTML responses', async () => {
    const calls: string[] = [];
    const result = await fetchFeed('https://example.com/page', async (input: RequestInfo | URL) => {
      calls.push(String(input));
      if (calls.length === 1) {
        return createResponse('<link rel="alternate" type="application/rss+xml" href="/rss.xml">', {
          contentType: 'text/html',
        });
      }

      return createResponse(rssXml);
    });

    expect(calls).toEqual(['https://example.com/page', 'https://example.com/rss.xml']);
    expect(result).toMatchObject({ success: true, feed: { title: 'Fetched RSS' } });
  });

  it('returns an error when HTML has no feed links', async () => {
    const result = await fetchFeed('https://example.com/page', async () => createResponse('<html></html>', {
      contentType: 'text/html',
    }));

    expect(result).toMatchObject({
      success: false,
      error: 'Not a valid RSS/Atom/JSON feed',
    });
  });

  it('returns network errors', async () => {
    const result = await fetchFeed('https://example.com/rss.xml', async () => {
      throw new Error('network down');
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('network down');
  });
});
