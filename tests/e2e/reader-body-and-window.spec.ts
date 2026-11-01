import { test, expect } from './fixtures';

test('reads JSON text and ordered Atom XHTML through the real worker and sanitization boundary', async ({ extension }) => {
  await extension.configureSettings({ markReadOnOpen: false });
  await extension.addFeed('/text-only.json');
  await extension.addFeed('/mixed-xhtml.xml');
  const page = await extension.context.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`chrome-extension://${extension.extensionId}/options.html#/all`);
  await page.getByRole('button', { name: /Text-only body/ }).click();
  const prose = page.locator('.reader-prose');
  await expect(prose).toContainText('2 < 3 & 4 > 1');
  await expect(prose).toContainText('<script>literal</script>');
  await expect(prose.locator('br')).toHaveCount(2);
  await expect(prose.locator('script')).toHaveCount(0);
  await page.getByRole('button', { name: /Mixed XHTML/ }).click();
  await expect(prose.locator('p')).toHaveText('Before middle after unsafe.');
  await expect(prose.locator('em')).toHaveText('middle');
  await expect(prose.locator('li')).toHaveText('First item');
  await expect(prose.locator('a[href]')).toHaveCount(0);
  expect(await prose.locator('pre').textContent()).toBe(' a\n  b');
  await page.reload();
  await page.getByRole('button', { name: /Mixed XHTML/ }).click();
  await expect(prose.locator('em')).toHaveText('middle');
});

test('bounds a cached large article window through scrolling, keyboard navigation and settings return', async ({ extension }) => {
  await extension.configureSettings({ markReadOnOpen: false });
  await extension.addFeed('/large-feed.xml');
  const page = await extension.context.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.addInitScript(() => {
    const tracker = window as typeof window & { maximumArticleRows: number };
    tracker.maximumArticleRows = 0;
    new MutationObserver(() => {
      tracker.maximumArticleRows = Math.max(
        tracker.maximumArticleRows,
        document.querySelectorAll('[data-reader-article-id]').length,
      );
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(`chrome-extension://${extension.extensionId}/options.html#/all`);
  const panel = page.getByTestId('article-panel');
  await expect(panel.getByRole('button', { name: /Large article 0$/ })).toBeVisible();
  const scroller = panel.locator(':scope > .reader-scrollbar');
  await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const last = panel.getByRole('button', { name: /Large article 1999$/ });
  await expect(last).toBeVisible();
  await last.click();
  await last.press('ArrowLeft');
  await expect(page.locator('[data-reader-article-id][data-active="true"]')).toContainText('Large article 1998');
  await expect(page.locator('[data-reader-article-id][data-active="true"]')).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByTestId('settings-container')).toBeVisible();
  await page.getByRole('button', { name: 'All Articles', exact: true }).click();
  await expect(panel).toContainText('2000 items');
  expect(await page.evaluate(() => (
    window as typeof window & { maximumArticleRows: number }
  ).maximumArticleRows)).toBeLessThanOrEqual(40);
});
