import { test, expect } from './fixtures';

test('reads a long article without repeated processing on reader controls', async ({ extension }) => {
  await extension.configureSettings({ ai: { showArticleSummary: false } });
  await extension.addFeed('/long-feed.xml');
  const page = await extension.context.newPage();
  await page.addInitScript(() => {
    const tracker = window as typeof window & { readerTemplateCount: number };
    tracker.readerTemplateCount = 0;
    const create = document.createElement.bind(document);
    document.createElement = ((...args: Parameters<Document['createElement']>) => {
      if (args[0] === 'template') {
        tracker.readerTemplateCount += 1;
      }
      return create(...args);
    }) as Document['createElement'];
  });
  const startedAt = Date.now();
  await page.goto(`chrome-extension://${extension.extensionId}/options.html#/all`);
  await page.getByRole('button', { name: /Long Summary Article/ }).click();
  await expect(page.locator('.reader-prose')).toContainText('Long article evidence.');
  const initialTemplates = await page.evaluate(() => (
    window as typeof window & { readerTemplateCount: number }
  ).readerTemplateCount);
  const loadedIn = Date.now() - startedAt;
  const controlsStartedAt = Date.now();
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole('button', { name: 'Star article', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Star article', exact: true }).locator('svg')).toHaveClass(/fill-current/);
    await page.getByRole('button', { name: 'Star article', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Star article', exact: true }).locator('svg')).not.toHaveClass(/fill-current/);
  }
  const templatesAfterControls = await page.evaluate(() => (
    window as typeof window & { readerTemplateCount: number }
  ).readerTemplateCount);
  console.log(JSON.stringify({ initialTemplates, templatesAfterControls, loadedIn, controlsIn: Date.now() - controlsStartedAt }));
  expect(initialTemplates).toBe(3);
  expect(templatesAfterControls).toBe(initialTemplates);
});
