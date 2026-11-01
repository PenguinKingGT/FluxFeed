import { test, expect } from './fixtures';

test('refreshes a single feed and all feeds, shows failures and retries without navigation', async ({ extension, fixtureServer }) => {
  await extension.configureSettings({ markReadOnOpen: false });
  await extension.addFeed('/refresh-feed.xml?source=one');
  await extension.addFeed('/refresh-feed.xml?source=two');
  const page = await extension.context.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`chrome-extension://${extension.extensionId}/options.html#/all`);
  await page.getByText('Refresh one', { exact: true }).first().click();
  const initialRoute = page.url();
  await page.getByRole('button', { name: /one Article 0/ }).click();
  fixtureServer.refresh.revision = 1;
  fixtureServer.refresh.requests = [];
  await page.getByRole('button', { name: 'Refresh feeds', exact: true }).click();
  await expect(page.getByRole('button', { name: /one Article 1/ })).toBeVisible();
  expect(page.url()).toBe(initialRoute);
  expect(fixtureServer.refresh.requests).toEqual(['/refresh-feed.xml?source=one']);
  await expect(page.getByTestId('reading-pane').getByRole('heading', { name: 'one Article 0' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toContainText('3');

  await page.getByRole('button', { name: 'All Articles', exact: true }).click();
  fixtureServer.refresh.revision = 2;
  fixtureServer.refresh.requests = [];
  await page.getByRole('button', { name: 'Refresh feeds', exact: true }).click();
  await expect(page.getByRole('button', { name: /one Article 2/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /two Article 2/ })).toBeVisible();
  expect(fixtureServer.refresh.requests.sort()).toEqual([
    '/refresh-feed.xml?source=one', '/refresh-feed.xml?source=two',
  ]);
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toContainText('6');

  fixtureServer.refresh.rejectRequests = true;
  await page.getByRole('button', { name: 'Refresh feeds', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText("Couldn't refresh feeds. Please try again.");
  await expect(page.getByRole('button', { name: 'Refresh feeds', exact: true })).toBeEnabled();
  fixtureServer.refresh.rejectRequests = false;
  fixtureServer.refresh.revision = 3;
  await page.getByRole('button', { name: 'Refresh feeds', exact: true }).click();
  await expect(page.getByRole('button', { name: /one Article 3/ })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toContainText('8');
});
