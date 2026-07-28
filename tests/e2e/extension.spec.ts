import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { chromium, expect, test, type BrowserContext } from '@playwright/test';

let context: BrowserContext | undefined;
let extensionId: string;
let fixtureServer: Server | undefined;
let fixtureFeedUrl: string;

test.beforeAll(async () => {
  fixtureServer = createServer((request, response) => {
    if (request.url !== '/feed.xml') {
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
          <title>P0 Test Feed</title>
          <description>Local Playwright RSS fixture</description>
          <link>http://127.0.0.1/</link>
          <item>
            <guid>p0-article-1</guid>
            <title>Integration Test Article</title>
            <link>http://127.0.0.1/article-1</link>
            <description>Searchable Playwright summary</description>
            <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[
              <p>This article verifies the complete subscription and reading workflow.</p>
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

  await page.getByRole('button', { name: 'Add Feed' }).click();
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

  await page.getByRole('button', { name: 'Add Feed' }).click();
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
