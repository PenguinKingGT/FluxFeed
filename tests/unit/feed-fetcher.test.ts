import { afterEach, describe, expect, it, vi } from 'vitest';

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
  afterEach(() => {
    vi.useRealTimers();
  });
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

  it('discovers a relative feed URL without any browser DOM APIs', async () => {
    vi.stubGlobal('DOMParser', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    const calls: string[] = [];

    try {
      const result = await fetchFeed('https://example.com/blog/', async (input) => {
        calls.push(String(input));
        if (calls.length === 1) {
          return createResponse(`
            <!doctype html><html><head>
              <link rel="alternate" type="application/rss+xml" href="../rss.xml">
            </head><body>Blog</body></html>
          `, { contentType: 'text/html' });
        }
        return createResponse(rssXml);
      });

      expect(result).toMatchObject({
        success: true,
        resolvedUrl: 'https://example.com/rss.xml',
        feed: { title: 'Fetched RSS' },
      });
      expect(calls).toEqual(['https://example.com/blog/', 'https://example.com/rss.xml']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns network errors', async () => {
    const result = await fetchFeed('https://example.com/rss.xml', async () => {
      throw new Error('network down');
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('network down');
  });

  it('rejects a self-referencing discovery link without making another request', async () => {
    const fetcher = vi.fn().mockImplementation(async () => {
      if (fetcher.mock.calls.length > 2) {
        throw new Error('Test loop guard');
      }
      return createResponse('<link rel="alternate" type="application/rss+xml" href="/page#feed">', {
        contentType: 'text/html',
      });
    });

    const result = await fetchFeed('https://example.com/page', fetcher);

    expect(result).toMatchObject({ success: false, error: 'FEED_DISCOVERY_LOOP' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a discovery cycle across two pages', async () => {
    const calls: string[] = [];
    const result = await fetchFeed('https://example.com/a', async (input) => {
      calls.push(String(input));
      if (calls.length > 3) {
        throw new Error('Test loop guard');
      }
      const target = String(input).endsWith('/a') ? '/b' : '/a';
      return createResponse(`<link rel="alternate" type="application/rss+xml" href="${target}">`, {
        contentType: 'text/html',
      });
    });

    expect(result).toMatchObject({ success: false, error: 'FEED_DISCOVERY_LOOP' });
    expect(calls).toHaveLength(2);
  });

  it('limits discovery to five followed links', async () => {
    let calls = 0;
    const result = await fetchFeed('https://example.com/0', async () => {
      calls += 1;
      if (calls > 8) {
        throw new Error('Test hop guard');
      }
      return createResponse(`<link rel="alternate" type="application/rss+xml" href="/${calls}">`, {
        contentType: 'text/html',
      });
    });

    expect(result).toMatchObject({ success: false, error: 'FEED_DISCOVERY_LIMIT' });
    expect(calls).toBe(6);
  });

  it('times out a stalled request even if the fetch adapter ignores abort', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise<Response>(() => {}));
    const pending = fetchFeed('https://example.com/feed.xml', fetcher);
    await vi.advanceTimersByTimeAsync(30001);

    // A sentinel keeps the pre-fix failure deterministic instead of hanging this test.
    const result = await Promise.race([pending, Promise.resolve('still pending')]);
    expect(result).toMatchObject({ success: false, error: 'FEED_TIMEOUT' });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out stalled body reads and cancels the stream', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const pending = fetchFeed('https://example.com/feed.xml', async () => new Response(
      new ReadableStream<Uint8Array>({ cancel }),
    ));
    await vi.advanceTimersByTimeAsync(30001);

    const result = await Promise.race([pending, Promise.resolve('still pending')]);
    expect(result).toMatchObject({ success: false, error: 'FEED_TIMEOUT' });
    expect(cancel).toHaveBeenCalled();
  });

  it('rejects an oversized declared response before reading its body', async () => {
    const cancel = vi.fn();
    const result = await fetchFeed('https://example.com/feed.xml', async () => new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(rssXml));
        },
        cancel,
      }),
      { headers: { 'content-length': String(20 * 1024 * 1024 + 1) } },
    ));

    expect(result).toMatchObject({ success: false, error: 'FEED_RESPONSE_TOO_LARGE' });
    expect(cancel).toHaveBeenCalled();
  });

  it('enforces the stream byte limit even when content-length understates the size', async () => {
    const cancel = vi.fn();
    const result = await fetchFeed('https://example.com/feed.xml', async () => new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(20 * 1024 * 1024 + 1));
        },
        cancel,
      }),
      { headers: { 'content-length': '1' } },
    ));

    expect(result).toMatchObject({ success: false, error: 'FEED_RESPONSE_TOO_LARGE' });
    expect(cancel).toHaveBeenCalled();
  });

  it('shares the deadline across discovery requests', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => {
      setTimeout(() => resolve(createResponse(
        '<link rel="alternate" type="application/rss+xml" href="/feed">',
        { contentType: 'text/html' },
      )), 20000);
    })).mockImplementationOnce(() => new Promise<Response>(() => {}));
    const pending = fetchFeed('https://example.com/page', fetcher);
    await vi.advanceTimersByTimeAsync(30001);
    expect(await pending).toMatchObject({ success: false, error: 'FEED_TIMEOUT' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('accepts a feed at the fifth discovery hop', async () => {
    let calls = 0;
    const result = await fetchFeed('https://example.com/0', async () => {
      calls += 1;
      return calls === 6 ? createResponse(rssXml) : createResponse(
        `<link rel="alternate" type="application/rss+xml" href="/${calls}">`,
        { contentType: 'text/html' },
      );
    });
    expect(result.success).toBe(true);
    expect(calls).toBe(6);
  });

  it('resolves relative discovery links against the redirect destination', async () => {
    const fetcher = vi.fn().mockImplementationOnce(async () => {
      const response = createResponse(
        '<link rel="alternate" type="application/rss+xml" href="feed.xml">',
        { contentType: 'text/html' },
      );
      Object.defineProperty(response, 'url', { value: 'https://other.example/blog/' });
      return response;
    }).mockImplementationOnce(async () => createResponse(rssXml));
    expect((await fetchFeed('https://example.com', fetcher)).success).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe('https://other.example/blog/feed.xml');
  });

  it('cancels late responses after timeout without continuing discovery and allows a fresh retry', async () => {
    vi.useFakeTimers();
    let finish!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const pending = fetchFeed('https://example.com/page', fetcher);
    await vi.advanceTimersByTimeAsync(30001);
    expect(await pending).toMatchObject({ error: 'FEED_TIMEOUT' });
    const cancel = vi.fn();
    finish(new Response(new ReadableStream<Uint8Array>({ cancel })));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
    expect((await fetchFeed('https://example.com/page', async () => createResponse(rssXml))).success).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not await a stalled source cancellation when rejecting a large response', async () => {
    const result = await fetchFeed('https://example.com/feed', async () => new Response(
      new ReadableStream<Uint8Array>({ cancel: () => new Promise(() => {}) }),
      { headers: { 'content-length': String(20 * 1024 * 1024 + 1) } },
    ));
    expect(result).toMatchObject({ success: false, error: 'FEED_RESPONSE_TOO_LARGE' });
  });

});
