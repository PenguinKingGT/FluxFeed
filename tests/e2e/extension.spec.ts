import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { chromium, expect, test, type BrowserContext } from '@playwright/test';

let context: BrowserContext | undefined;
let extensionId: string;
let fixtureServer: Server | undefined;
let fixtureFeedUrl: string;
let aiRequests = 0;
let rejectAiRequests = false;
let nativeRequests: Array<{ provider: string; key?: string; body: string }> = [];

test.beforeAll(async () => {
  fixtureServer = createServer((request, response) => {
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
        nativeRequests.push({
          provider: nativeProvider,
          key: typeof key === 'string' ? key : undefined,
          body,
        });
        const text = JSON.stringify({
          overview: `Native ${nativeProvider} summary ${nativeRequests.length}`,
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
      aiRequests += 1;
      request.resume();
      response.writeHead(rejectAiRequests ? 500 : 200, {
        'Content-Type': 'application/json',
      });
      response.end(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          overview: `Local AI summary ${aiRequests}`,
          keyPoints: ['A verified section summary'],
        }) } }],
      }));
      return;
    }
    const isLongFeed = request.url === '/long-feed.xml';
    if (request.url !== '/feed.xml' && !isLongFeed) {
      response.writeHead(404).end();
      return;
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
            <title>${isLongFeed ? 'Long Summary Article' : 'Integration Test Article'}</title>
            <link>http://127.0.0.1/article-1</link>
            <description>Searchable Playwright summary</description>
            <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[
              <p>${isLongFeed ? 'Long article evidence. '.repeat(7200) : 'This article verifies the complete subscription and reading workflow.'}</p>
            ]]></content:encoded>
            <author>FluxFeed Test</author>
            <pubDate>Tue, 28 Jul 2026 12:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`);
  });
  await new Promise<void>((resolve, reject) => {
    fixtureServer?.once('error', reject);
    fixtureServer?.listen(0, '127.0.0.1', resolve);
  });
  const address = fixtureServer.address() as AddressInfo;
  fixtureFeedUrl = `http://127.0.0.1:${address.port}/feed.xml`;

  const extensionPath = path.resolve('.output/chrome-mv3');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  serviceWorker ??= await context.waitForEvent('serviceworker');
  extensionId = new URL(serviceWorker.url()).host;
});

test.afterAll(async () => {
  await context?.close();
  await new Promise<void>((resolve, reject) => {
    if (!fixtureServer) {
      resolve();
      return;
    }
    fixtureServer.close((error) => error ? reject(error) : resolve());
  });
});

test('renders the options reader and settings hash route', async () => {
  if (!context) throw new Error('Extension browser context was not created');
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByTestId('reader-layout')).toBeVisible();

  await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
  const feedUrlInput = page.getByLabel('Feed URL');
  const folderSelect = page.getByRole('combobox', { name: 'Folder' });
  const folderSelectTrigger = page.locator('[data-slot="select-trigger"]');
  await expect(feedUrlInput).toBeVisible();
  await expect(folderSelect).toBeVisible();
  await expect.poll(async () => {
    const [inputBox, selectBox] = await Promise.all([
      feedUrlInput.boundingBox(),
      folderSelect.boundingBox(),
    ]);
    return Math.abs((inputBox?.width ?? 0) - (selectBox?.width ?? 0));
  }).toBeLessThanOrEqual(1);

  await folderSelect.click();
  const selectContent = page.locator('[data-slot="select-content"]');
  await expect(selectContent).toBeVisible();
  await page.waitForTimeout(150);
  const [selectBox, contentBox] = await Promise.all([
    folderSelectTrigger.boundingBox(),
    selectContent.boundingBox(),
  ]);
  expect(
    Math.abs((selectBox?.width ?? 0) - (contentBox?.width ?? 0)),
    JSON.stringify({ triggerWidth: selectBox?.width, contentWidth: contentBox?.width }),
  ).toBeLessThanOrEqual(1);

  await page.goto(`chrome-extension://${extensionId}/options.html#/settings`);
  await expect(page.getByTestId('settings-container')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();

  const colorThemeGroup = page.getByRole('radiogroup', { name: 'Color Theme' });
  const appearanceModeGroup = page.getByRole('group', { name: 'Appearance Mode' });
  await expect(colorThemeGroup.getByLabel('Quiet Signal')).toBeChecked();
  await colorThemeGroup.getByLabel('Graphite').click();
  await appearanceModeGroup.getByLabel('Dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'graphite');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 23, 28)');

  await colorThemeGroup.getByLabel('Forest').click();
  await appearanceModeGroup.getByLabel('Light').click();
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'forest');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 245, 239)');

  const largeTextSize = page.getByLabel('Large 19px');
  await largeTextSize.click();
  await expect(largeTextSize).toHaveAttribute('data-state', 'on');
  await expect(
    page.getByText('A comfortable type size keeps long articles calm, clear, and easy to follow.'),
  ).toHaveCSS('font-size', '19px');

  const readingFontGroup = page.getByRole('radiogroup', { name: 'Reading Font' });
  const interfaceFontGroup = page.getByRole('radiogroup', { name: 'Interface Font' });
  await readingFontGroup.getByLabel('LXGW WenKai').click();
  await interfaceFontGroup.getByLabel('LXGW WenKai').click();
  await expect(page.locator('html')).toHaveAttribute('data-reading-font', 'lxgw-wenkai');
  await expect(page.locator('html')).toHaveAttribute('data-interface-font', 'lxgw-wenkai');
  await expect(page.locator('body')).toHaveCSS('font-family', /LXGW WenKai Lite/);
  await expect(page.getByRole('heading', { name: 'Options' })).toHaveCSS('font-family', /LXGW WenKai Lite/);
  await expect.poll(
    () => page.evaluate(async () => (
      await document.fonts.load('600 20px "LXGW WenKai Lite"', '文章列表')
    ).length > 0),
  ).toBe(true);
  await expect(
    page.getByText('A comfortable type size keeps long articles calm, clear, and easy to follow.'),
  ).toHaveCSS('font-family', /LXGW WenKai Lite/);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'forest');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('radiogroup', { name: 'Color Theme' }).getByLabel('Forest')).toBeChecked();
  await expect(page.getByRole('group', { name: 'Appearance Mode' }).getByLabel('Light')).toHaveAttribute('data-state', 'on');
  await expect(page.getByLabel('Large 19px')).toHaveAttribute('data-state', 'on');
  await expect(page.getByRole('radiogroup', { name: 'Reading Font' }).getByLabel('LXGW WenKai')).toBeChecked();
  await expect(page.getByRole('radiogroup', { name: 'Interface Font' }).getByLabel('LXGW WenKai')).toBeChecked();
});

test('adapts the reader chrome to laptop and narrow widths', async () => {
  if (!context) throw new Error('Extension browser context was not created');
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`chrome-extension://${extensionId}/options.html#/inbox`);

  const sidebar = page.getByTestId('reader-sidebar');
  const articlePanel = page.getByTestId('article-panel');
  await expect(sidebar).toBeVisible();
  await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(72);
  await expect.poll(async () => Math.round((await articlePanel.boundingBox())?.width ?? 0)).toBe(320);
  await page.getByRole('button', { name: 'Browse folders' }).click();
  await expect(page.locator('[data-slot="popover-content"]').getByText('Folders', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1000, height: 800 });
  await expect.poll(async () => Math.round((await sidebar.boundingBox())?.x ?? 0)).toBeLessThanOrEqual(-239);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect.poll(async () => Math.round((await sidebar.boundingBox())?.x ?? -1)).toBe(0);
  await page.keyboard.press('Escape');
  await expect.poll(async () => Math.round((await sidebar.boundingBox())?.x ?? 0)).toBeLessThanOrEqual(-239);

  await page.setViewportSize({ width: 760, height: 800 });
  await expect.poll(async () => Math.round((await articlePanel.boundingBox())?.width ?? 0)).toBe(760);
  await expect(page.getByText('Select an article')).toBeHidden();
});

test('configures AI summaries and opens the daily briefing route', async () => {
  if (!context) throw new Error('Extension browser context was not created');
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`chrome-extension://${extensionId}/options.html#/settings?section=ai`);

  const apiUrl = page.getByLabel('API URL');
  const model = page.getByLabel('Model');
  const automaticSummary = page.getByRole('switch', { name: 'Summarize on open' });
  const minimumLength = page.getByRole('spinbutton', { name: 'Minimum article length' });

  await expect(apiUrl).toBeVisible();
  await apiUrl.fill('https://ai.example.com/v1/chat/completions');
  await model.fill('reader-model');
  await automaticSummary.click();
  await expect(minimumLength).toBeEnabled();
  await minimumLength.fill('1600');

  await page.reload();
  await expect(apiUrl).toHaveValue('https://ai.example.com/v1/chat/completions');
  await expect(model).toHaveValue('reader-model');
  await expect(automaticSummary).toBeChecked();
  await expect(minimumLength).toHaveValue('1600');

  await page.goto(`chrome-extension://${extensionId}/options.html#/digest`);
  await expect(page.getByTestId('daily-digest-layout')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today’s Briefing' })).toBeVisible();
  await expect(page.getByText('No articles arrived today.')).toBeVisible();
});

test('completes the subscription, reading, persistence, search, and deletion workflow', async () => {
  if (!context) throw new Error('Extension browser context was not created');
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`chrome-extension://${extensionId}/options.html#/inbox`);

  await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
  await page.getByLabel('Feed URL').fill(fixtureFeedUrl);
  await page.getByRole('button', { name: 'Subscribe' }).click();

  const articleCard = page.getByRole('button', { name: /Integration Test Article/ });
  await expect(articleCard).toBeVisible();
  await expect(page.getByText('P0 Test Feed', { exact: true }).first()).toBeVisible();

  await articleCard.click();
  const readingPane = page.getByTestId('reading-pane');
  await expect(
    readingPane.getByRole('heading', { name: 'Integration Test Article' }),
  ).toBeVisible();
  await expect(
    readingPane.getByText('complete subscription and reading workflow'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Star article' }).click();
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await page.getByRole('button', { name: 'Starred' }).click();
  await expect(page.getByRole('button', { name: /Integration Test Article/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /Integration Test Article/ })).toBeVisible();

  const search = page.getByLabel('Search articles...');
  await search.fill('Playwright summary');
  await expect(page.getByRole('button', { name: /Integration Test Article/ })).toBeVisible();
  await search.fill('missing result');
  await expect(page.getByText('No matching articles')).toBeVisible();
  await search.fill('');

  const feedNode = page.getByTestId(/tree-node-feed:/).filter({ hasText: 'P0 Test Feed' });
  await feedNode.hover();
  await page.getByRole('button', { name: 'Delete feed P0 Test Feed' }).click();
  await page.getByRole('button', { name: 'Delete feed', exact: true }).click();

  await expect(page.getByText('P0 Test Feed', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Integration Test Article/ })).toHaveCount(0);
});


test('summarizes a confirmed article prefix and retains the cache after AI failure', async () => {
  if (!context) {
    throw new Error('Extension browser context was not created');
  }
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const origin = new URL(fixtureFeedUrl).origin;
  await page.goto(`chrome-extension://${extensionId}/options.html#/settings?section=ai`);
  await page.getByLabel('API URL').fill(`${origin}/ai/chat/completions`);
  await page.getByLabel('Model', { exact: true }).fill('local-summary-model');
  const automaticSummary = page.getByRole('switch', { name: 'Summarize on open' });
  if (await automaticSummary.isChecked()) {
    await automaticSummary.click();
  }

  await page.goto(`chrome-extension://${extensionId}/options.html#/inbox`);
  await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
  await page.getByLabel('Feed URL').fill(`${origin}/long-feed.xml`);
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await page.getByRole('button', { name: /Long Summary Article/ }).click();

  aiRequests = 0;
  await page.getByRole('button', { name: 'Generate summary' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(aiRequests).toBe(0);
  await page.getByRole('button', { name: 'Summarize opening portion' }).click();
  await expect(page.getByText('Local AI summary 6', { exact: true })).toBeVisible();
  expect(aiRequests).toBe(6);
  await expect(page.getByText('Partial summary: only the opening portion of the article was processed.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Long Summary Article/ }).click();
  await expect(page.getByText('Local AI summary 6', { exact: true })).toBeVisible();
  expect(aiRequests).toBe(6);

  rejectAiRequests = true;
  try {
    await page.getByRole('button', { name: 'Regenerate' }).click();
    await page.getByRole('button', { name: 'Summarize opening portion' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('Local AI summary 6', { exact: true })).toBeVisible();
    expect(aiRequests).toBe(8);
    await page.screenshot({ path: '/tmp/fluxfeed-long-article-summary.png' });
  } finally {
    rejectAiRequests = false;
    await page.close();
  }
});


for (const fixture of [
  { provider: 'google', label: 'Gemini', model: 'gemini-2.5-flash' },
  { provider: 'anthropic', label: 'Claude', model: 'claude-sonnet-4-5' },
]) {
  test(`configures ${fixture.label} and generates a native long-article summary`, async () => {
    if (!context) {
      throw new Error('Extension browser context was not created');
    }
    const page = await context.newPage();
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(`chrome-extension://${extensionId}/options.html#/settings?section=ai`);
    await page.getByRole('radio', { name: fixture.label, exact: true }).click();
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('');
    await expect(page.getByText('No key saved', { exact: true })).toBeVisible();
    const key = `local-${fixture.provider}-test-key`;
    await page.getByLabel('API Key', { exact: true }).fill(key);
    await page.getByRole('button', { name: 'Save key', exact: true }).click();
    await expect(page.getByText('A key is saved', { exact: true })).toBeVisible();
    await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('');
    const origin = new URL(fixtureFeedUrl).origin;
    await page.getByLabel('API URL').fill(`${origin}/${fixture.provider}`);
    await page.getByLabel('Model', { exact: true }).fill(fixture.model);
    await page.reload();
    await expect(page.getByRole('radio', { name: fixture.label, exact: true })).toBeChecked();
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue(fixture.model);
    await expect(page.getByText('A key is saved', { exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/fluxfeed-${fixture.provider}-settings.png` });

    nativeRequests = [];
    await page.getByRole('button', { name: 'Test connection', exact: true }).click();
    await expect(page.getByText('Connection successful', { exact: true })).toBeVisible();
    expect(nativeRequests).toHaveLength(1);
    expect(nativeRequests[0].key).toBe(key);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`chrome-extension://${extensionId}/options.html#/all`);
    await page.getByRole('button', { name: /Long Summary Article/ }).click();
    nativeRequests = [];
    await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
    await page.getByRole('button', { name: 'Summarize opening portion', exact: true }).click();
    const overview = `Native ${fixture.provider} summary 6`;
    await expect(page.getByText(overview, { exact: true })).toBeVisible();
    expect(nativeRequests).toHaveLength(6);
    expect(nativeRequests.every((item) => item.provider === fixture.provider && item.key === key)).toBe(true);
    expect(nativeRequests[0].body).toContain('Long article evidence.');
    await page.reload();
    await page.getByRole('button', { name: /Long Summary Article/ }).click();
    await expect(page.getByText(overview, { exact: true })).toBeVisible();
    expect(nativeRequests).toHaveLength(6);
    await page.close();
  });
}

test('creates folders and feeds from the plus menu while keeping the footer feed-only', async () => {
  if (!context) {
    throw new Error('Extension browser context was not created');
  }
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`chrome-extension://${extensionId}/options.html#/all`);
  await expect(page.getByRole('button', { name: 'Add Feed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add feed or folder', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Add Feed', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Create folder', exact: true }).click();
  await page.getByLabel('Folder name').fill('Reading');
  await page.getByLabel('Folder name').press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();

  const folder = page.getByTestId(/^tree-node-folder:/).filter({ hasText: 'Reading' });
  await folder.hover();
  await page.getByRole('button', { name: 'Add in Reading', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Add Feed', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Folder', exact: true })).toContainText('Reading');
  await page.getByLabel('Feed URL').fill(fixtureFeedUrl);
  await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: /Integration Test Article/ })).toBeVisible();

  await folder.hover();
  await page.getByRole('button', { name: 'Add in Reading', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Create folder', exact: true }).click();
  await page.getByLabel('Folder name').fill('Engineering');
  await page.getByRole('button', { name: 'Create folder', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByTestId(/^tree-node-folder:/).filter({ hasText: 'Engineering' }).hover();
  await page.getByRole('button', { name: 'Add in Engineering', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Create folder', exact: true })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Add Feed', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Folder', exact: true })).toContainText('Reading / Engineering');
  await page.keyboard.press('Escape');

  // Capture the compact forms in the same warm Chinese interface as the report.
  await page.goto(`chrome-extension://${extensionId}/options.html#/settings?section=appearance`);
  await page.getByRole('radiogroup', { name: 'Color Theme' }).getByLabel('Quiet Signal').click();
  await page.getByRole('group', { name: 'Appearance Mode' }).getByLabel('Light').click();
  await page.getByRole('combobox', { name: 'Language', exact: true }).click();
  await page.getByRole('option', { name: '简体中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.goto(`chrome-extension://${extensionId}/options.html#/all`);
  await page.getByRole('button', { name: '添加订阅', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('radiogroup')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: '/tmp/fluxfeed-add-feed-compact.png', animations: 'disabled' });
  await page.getByLabel('订阅地址').fill('https://example.com/unsaved');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '添加订阅', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '添加订阅', exact: true }).click();
  await expect(page.getByLabel('订阅地址')).toHaveValue('');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '添加订阅或目录', exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.screenshot({ path: '/tmp/fluxfeed-folder-add-menu.png', animations: 'disabled' });
  await page.getByRole('menuitem', { name: '创建目录', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: '/tmp/fluxfeed-create-folder-compact.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 700 });
  await page.getByRole('button', { name: '打开导航', exact: true }).click();
  await page.getByRole('button', { name: '添加订阅', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect.poll(async () => dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(dialog.getByRole('button', { name: '订阅', exact: true })).toBeVisible();
  await page.getByLabel('订阅地址').click();
  await expect(page.getByLabel('订阅地址')).toBeFocused();
  await page.screenshot({ path: '/tmp/fluxfeed-add-feed-mobile.png', animations: 'disabled' });
  await page.close();
});
