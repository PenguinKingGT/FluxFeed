import { createServer } from 'node:http';

export interface NativeRequest {
  provider: string;
  key?: string;
  body: string;
}

export interface FixtureServer {
  origin: string;
  feedUrl: string;
  ai: {
    requests: number;
    rejectRequests: boolean;
    nativeRequests: NativeRequest[];
  };
  close(): Promise<void>;
}

/** Starts a test-local HTTP server whose responses and AI counters belong to one test. */
export async function startFixtureServer(): Promise<FixtureServer> {
  const ai: FixtureServer['ai'] = {
    requests: 0,
    rejectRequests: false,
    nativeRequests: [],
  };
  let fixtureFeedUrl = '';
  const server = createServer((request, response) => {
    let nativeProvider: 'google' | 'anthropic' | null = null;
    if (request.url?.startsWith('/google/models/')) {
      nativeProvider = 'google';
    } else if (request.url === '/anthropic/messages') {
      nativeProvider = 'anthropic';
    }
    if (nativeProvider) {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk.toString();
      });
      request.on('end', () => {
        const key = request.headers[nativeProvider === 'google' ? 'x-goog-api-key' : 'x-api-key'];
        ai.nativeRequests.push({
          provider: nativeProvider,
          key: typeof key === 'string' ? key : undefined,
          body,
        });
        const text = JSON.stringify({
          overview: `Native ${nativeProvider} summary ${ai.nativeRequests.length}`,
          keyPoints: ['A native protocol summary'],
        });
        const result = nativeProvider === 'google'
          ? {
            candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3, totalTokenCount: 13 },
          }
          : {
            id: 'msg_local',
            type: 'message',
            role: 'assistant',
            model: 'claude-sonnet-4-5',
            content: [{ type: 'text', text }],
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: { input_tokens: 10, output_tokens: 3 },
          };
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
      });
      return;
    }
    if (request.url === '/ai/chat/completions') {
      ai.requests += 1;
      request.resume();
      response.writeHead(ai.rejectRequests ? 500 : 200, {
        'Content-Type': 'application/json',
      });
      response.end(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          overview: `Local AI summary ${ai.requests}`,
          keyPoints: ['A verified section summary'],
        }) } }],
      }));
      return;
    }
    if (request.url === '/article-1') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><title>Original article</title><p>Original article content.</p>');
      return;
    }
    if (request.url === '/discovery/website') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html><head>
        <!-- <link rel="alternate" type="application/rss+xml" href="/comment-feed"> -->
        <link rel="alternate" type="application/rss+xml" href="http://[invalid">
        <link rel="alternate" type="application/rss+xml" href="feed.xml?format=rss&amp;lang=en">
        </head><body>Website with a relative feed link.</body></html>`);
      return;
    }
    if (request.url === '/discovery/feed.xml?format=rss&lang=en') {
      response.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
      response.end(`<rss><channel>
        <title>Website Discovery Feed</title>
        <item><guid>discovered-article</guid><title>Discovered Website Article</title>
          <link>http://127.0.0.1/article-1</link>
          <description>Read after discovering a feed in the extension worker.</description>
          <pubDate>Tue, 28 Jul 2026 12:00:00 GMT</pubDate>
        </item></channel></rss>`);
      return;
    }
    const isLongFeed = request.url === '/long-feed.xml';
    const isReaderFeed = request.url === '/reader-feed.xml';
    const isStyleFeed = request.url === '/style-feed.xml';
    if (request.url !== '/feed.xml' && !isLongFeed && !isReaderFeed && !isStyleFeed) {
      response.writeHead(404).end();
      return;
    }

    let fixtureTitle = 'Integration Test Article';
    let fixtureContent = 'This article verifies the complete subscription and reading workflow.';
    if (isStyleFeed) {
      fixtureTitle = '文章样式排版示例';
      fixtureContent = `<h2>内容与层级</h2>
        <p>文章样式只改变正文排版。<a href="https://example.com/reference">阅读参考文档</a>，或试试行内代码 <code>sizes="auto"</code>。</p>
        <ul><li>链接与列表保持清楚的层级</li><li>支持嵌套内容<ol><li>先阅读概述</li><li>再查看细节</li></ol></li></ul>
        <blockquote><p>让内容自然呈现，让长文读起来更轻松。</p></blockquote>
        <h3>代码与数据</h3><pre><code>function greet(name) {
  return 'Hello, ' + name;
}
// ${'long-line-'.repeat(30)}</code></pre>
        <table><thead><tr><th>主题</th><th>链接</th><th>引用</th><th>代码</th><th>备注</th></tr></thead>
        <tbody><tr><td>原始</td><td>清晰</td><td>简洁</td><td>保留缩进</td><td>沿用当前样式</td></tr>
        <tr><td>Vue 风格</td><td>绿色</td><td>浅色背景</td><td>轻量边框</td><td>文档阅读</td></tr></tbody></table><hr>`;
    } else if (isReaderFeed) {
      fixtureTitle = '科技爱好者周刊（第 412 期）：禁止 issue，只用 PR';
      fixtureContent = '这里记录每周值得分享的科技内容，让阅读回到内容本身。'.repeat(50);
    } else if (isLongFeed) {
      fixtureTitle = 'Long Summary Article';
      fixtureContent = 'Long article evidence. '.repeat(7200);
    }

    response.writeHead(200, {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>${isLongFeed ? 'Long Article Feed' : 'P0 Test Feed'}</title>
          <description>Local Playwright RSS fixture</description>
          <link>http://127.0.0.1/</link>
          <item>
            <guid>${isLongFeed ? 'long-article-1' : 'p0-article-1'}</guid>
            <title>${fixtureTitle}</title>
            <link>${fixtureFeedUrl.replace('/feed.xml', '/article-1')}</link>
            <description>Searchable Playwright summary</description>
            <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[
              <p>${fixtureContent}</p>
            ]]></content:encoded>
            <author>FluxFeed Test</author>
            <pubDate>Tue, 28 Jul 2026 12:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fixture server did not receive a TCP port');
  }
  fixtureFeedUrl = `http://127.0.0.1:${address.port}/feed.xml`;

  return {
    origin: new URL(fixtureFeedUrl).origin,
    feedUrl: fixtureFeedUrl,
    ai,
    /** Releases the test-local port after the extension profile has been closed. */
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
