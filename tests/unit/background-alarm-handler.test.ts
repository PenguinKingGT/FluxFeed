import { describe, expect, it, vi } from 'vitest';
import { handleAlarm, REFRESH_ALARM_NAME } from '@/entrypoints/background/alarm';

describe('background alarm handler', () => {
  it('refreshes feeds, prunes old articles, and updates badge for refresh alarm', async () => {
    const dependencies = {
      refreshAllFeeds: vi.fn().mockResolvedValue(2),
      getSettings: vi.fn().mockResolvedValue({ refreshInterval: 30 }),
      pruneOldArticles: vi.fn(),
      pruneExcessArticles: vi.fn(),
      updateBadge: vi.fn(),
    };

    await handleAlarm({ name: REFRESH_ALARM_NAME }, dependencies);

    expect(dependencies.refreshAllFeeds).toHaveBeenCalled();
    expect(dependencies.pruneOldArticles).toHaveBeenCalledWith(30);
    expect(dependencies.pruneExcessArticles).toHaveBeenCalledWith(200);
    expect(dependencies.updateBadge).toHaveBeenCalled();
  });

  it('ignores unrelated alarms', async () => {
    const dependencies = {
      refreshAllFeeds: vi.fn(),
      getSettings: vi.fn(),
      pruneOldArticles: vi.fn(),
      pruneExcessArticles: vi.fn(),
      updateBadge: vi.fn(),
    };

    await handleAlarm({ name: 'other-alarm' }, dependencies);

    expect(dependencies.refreshAllFeeds).not.toHaveBeenCalled();
    expect(dependencies.pruneOldArticles).not.toHaveBeenCalled();
    expect(dependencies.pruneExcessArticles).not.toHaveBeenCalled();
    expect(dependencies.updateBadge).not.toHaveBeenCalled();
  });
});
