import { describe, expect, it } from 'vitest';

import { validateFeedUrl } from '@/lib/feed/feed-validator';

const rssXml = '<rss><channel><title>Valid Feed</title></channel></rss>';

describe('validateFeedUrl', () => {
  it('rejects invalid URLs', async () => {
    await expect(validateFeedUrl('not a url')).resolves.toMatchObject({
      valid: false,
      error: 'Invalid URL',
    });
  });

  it('rejects unsupported protocols', async () => {
    await expect(validateFeedUrl('ftp://example.com/feed.xml')).resolves.toMatchObject({
      valid: false,
      error: 'Only http and https URLs are supported',
    });
  });

  it('returns resolved URL and feed title when fetch succeeds', async () => {
    const result = await validateFeedUrl('https://example.com/feed.xml', async () => new Response(rssXml, {
      headers: { 'content-type': 'application/rss+xml' },
    }));

    expect(result).toEqual({
      valid: true,
      resolvedUrl: 'https://example.com/feed.xml',
      feedTitle: 'Valid Feed',
    });
  });

  it('returns user-readable errors when fetch fails', async () => {
    const result = await validateFeedUrl('https://example.com/feed.xml', async () => new Response('', {
      status: 500,
    }));

    expect(result).toMatchObject({
      valid: false,
      error: 'HTTP 500',
    });
  });
});
