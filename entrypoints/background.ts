import { browser } from 'wxt/browser';
import { createAiSecretStorage, createOpenAiCompatibleClient } from '@/lib/ai';
import type { BackgroundMessage, Feed, Message } from '@/lib/types';
import { createStorageService, db, ensureDatabaseDefaults } from '@/lib/db';
import { fetchFeed } from '@/lib/feed';
import { handleAlarm, registerRefreshAlarm } from './background/alarm';
import { updateBadge } from './background/badge';
import { handleInstall } from './background/install';
import { handleBackgroundMessage } from './background/message-handler';
import { refreshAllFeeds, refreshSingleFeed } from './background/refresh-feeds';

export default defineBackground(() => {
  const storageService = createStorageService(db);
  const updateExtensionBadge = () => updateBadge(browser, storageService);
  const refreshDependencies = { storageService, fetchFeed };
  const refreshOneFeed = (feed: Feed) => refreshSingleFeed(feed, refreshDependencies);
  const refreshFeeds = () => refreshAllFeeds(refreshDependencies);
  const registerAlarm = (intervalMinutes: number) => registerRefreshAlarm(browser, intervalMinutes);
  const aiSecretStorage = createAiSecretStorage(browser.storage.local);

  browser.runtime.onInstalled.addListener((details) => {
    void handleInstall(details, {
      ensureDatabaseDefaults: () => ensureDatabaseDefaults(db),
      getSettings: () => storageService.getSettings(),
      registerRefreshAlarm: registerAlarm,
    });
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    void handleAlarm(alarm, {
      refreshAllFeeds: refreshFeeds,
      getSettings: () => storageService.getSettings(),
      pruneOldArticles: (retentionDays) => storageService.pruneOldArticles(retentionDays),
      pruneExcessArticles: (maxArticlesPerFeed) =>
        storageService.pruneExcessArticles(maxArticlesPerFeed),
      updateBadge: updateExtensionBadge,
    });
  });

  browser.runtime.onMessage.addListener((message: Message | BackgroundMessage, _sender, sendResponse) => {
    void handleBackgroundMessage(message, {
      storageService,
      fetchFeed,
      updateBadge: updateExtensionBadge,
      refreshSingleFeed: refreshOneFeed,
      refreshAllFeeds: refreshFeeds,
      registerRefreshAlarm: registerAlarm,
      sessionStorage: browser.storage.session,
      senderTabId: _sender.tab?.id,
      aiSecretStorage,
      createAiClient: (settings, apiKey) => createOpenAiCompatibleClient({
        apiUrl: settings.apiUrl,
        model: settings.model,
        apiKey,
      }),
    }).then(sendResponse);

    return true;
  });
});
