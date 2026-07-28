export const REFRESH_ALARM_NAME = 'refresh-feeds';
export const GLOBAL_REFRESH_ALARM_NAME = REFRESH_ALARM_NAME;

interface AlarmCreateInfo {
  delayInMinutes?: number;
  periodInMinutes?: number;
}

interface ChromeAlarmApi {
  alarms: {
    clear(name: string): Promise<boolean> | boolean | void;
    create(name: string, alarmInfo: AlarmCreateInfo): Promise<void> | void;
  };
}

export async function registerRefreshAlarm(
  chromeApi: ChromeAlarmApi,
  intervalMinutes: number,
): Promise<void> {
  await chromeApi.alarms.clear(REFRESH_ALARM_NAME);

  if (intervalMinutes > 0) {
    chromeApi.alarms.create(REFRESH_ALARM_NAME, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes,
    });
  }
}

interface AlarmHandlerDependencies {
  refreshAllFeeds(): Promise<number>;
  getSettings(): Promise<{
    refreshInterval: number;
    retentionDays?: number;
    maxArticlesPerFeed?: number;
  }>;
  pruneOldArticles(retentionDays: number): Promise<void>;
  pruneExcessArticles(maxArticlesPerFeed: number): Promise<void>;
  updateBadge(): Promise<void>;
}

export async function handleAlarm(
  alarm: { name: string },
  dependencies: AlarmHandlerDependencies,
): Promise<void> {
  if (alarm.name !== REFRESH_ALARM_NAME) {
    return;
  }

  await dependencies.refreshAllFeeds();

  const settings = await dependencies.getSettings();
  await dependencies.pruneOldArticles(settings.retentionDays ?? 30);
  await dependencies.pruneExcessArticles(settings.maxArticlesPerFeed ?? 200);
  await dependencies.updateBadge();
}
