import path from 'node:path';
import { chromium, expect, test as base, type BrowserContext, type Worker } from '@playwright/test';
import type { Message, MessageResponse, SettingsPatch } from '@/lib/types';
import { startFixtureServer, type FixtureServer } from './fixture-server';

// This declaration describes the real Chrome runtime inside page.evaluate, not a mock.
declare const chrome: {
  runtime: {
    sendMessage(message: Message): Promise<MessageResponse>;
  };
};

interface ExtensionFixture {
  context: BrowserContext;
  extensionId: string;
  worker: Worker;
  configureSettings(patch: SettingsPatch): Promise<void>;
  addFeed(relativePath?: string): Promise<void>;
  outputPath(filename: string): string;
}

/** Gives every test and retry a fresh profile, IndexedDB, credentials, and HTTP server. */
export const test = base.extend<{
  fixtureServer: FixtureServer;
  extension: ExtensionFixture;
}>({
  // Playwright requires a destructured first parameter, even for fixtures with no dependencies.
  // oxlint-disable-next-line no-empty-pattern
  fixtureServer: async ({}, use) => {
    const server = await startFixtureServer();
    try {
      await use(server);
    } finally {
      await server.close();
    }
  },

  extension: async ({ fixtureServer }, use, testInfo) => {
    const extensionPath = path.resolve('.output/chrome-mv3');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      let [worker] = context.serviceWorkers();
      worker ??= await context.waitForEvent('serviceworker');
      const extensionId = new URL(worker.url()).host;
      const setupPage = await context.newPage();
      // Messages need a sender outside the background worker. Block app scripts on
      // this setup page so mounting the reader cannot race with prerequisite writes.
      await setupPage.route('**/*', async (route) => {
        if (route.request().resourceType() === 'script') {
          await route.abort();
          return;
        }
        await route.continue();
      });
      await setupPage.goto(`chrome-extension://${extensionId}/options.html`);
      await expect(setupPage.locator('#root')).toBeEmpty();

      /** Prepares state through production messages before mounting any reader pages. */
      async function send(message: Message): Promise<void> {
        const response = await setupPage.evaluate((request) => chrome.runtime.sendMessage(request), message);
        if (!response.success) {
          throw new Error(`Fixture ${message.action} failed: ${response.error ?? 'unknown error'}`);
        }
      }

      // Only the readiness read is polled; mutation retries could add duplicate feeds.
      await expect.poll(async () => {
        try {
          await send({ action: 'SETTINGS_GET' });
          return true;
        } catch {
          return false;
        }
      }, { message: 'Extension background message handler is ready' }).toBe(true);

      await use({
        context,
        extensionId,
        worker,
        /** Saves explicit prerequisites without depending on another test's settings. */
        async configureSettings(patch) {
          await send({ action: 'SETTINGS_UPDATE', payload: patch });
        },
        /** Seeds only subscriptions required by the current test using the normal add flow. */
        async addFeed(relativePath = '/feed.xml') {
          await send({
            action: 'FEED_ADD',
            payload: { url: new URL(relativePath, fixtureServer.origin).href },
          });
        },
        /** Keeps screenshots separate across tests, workers, repeats, and retries. */
        outputPath(filename) {
          return testInfo.outputPath(filename);
        },
      });
    } finally {
      // Closing the entire profile also stops pages and background requests after a failure.
      await context.close();
    }
  },
});

export { expect };
