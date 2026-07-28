import { describe, expect, it, vi } from 'vitest';

import { REFRESH_ALARM_NAME, registerRefreshAlarm } from '@/entrypoints/background/alarm';

describe('background alarm', () => {
  it('uses the refresh-feeds alarm name', () => {
    expect(REFRESH_ALARM_NAME).toBe('refresh-feeds');
  });

  it('clears and creates refresh alarm for positive intervals', async () => {
    const chromeApi = {
      alarms: {
        clear: vi.fn(async () => true),
        create: vi.fn(),
      },
    };

    await registerRefreshAlarm(chromeApi, 60);

    expect(chromeApi.alarms.clear).toHaveBeenCalledWith('refresh-feeds');
    expect(chromeApi.alarms.create).toHaveBeenCalledWith('refresh-feeds', {
      delayInMinutes: 60,
      periodInMinutes: 60,
    });
  });

  it('only clears refresh alarm for disabled intervals', async () => {
    const chromeApi = {
      alarms: {
        clear: vi.fn(async () => true),
        create: vi.fn(),
      },
    };

    await registerRefreshAlarm(chromeApi, 0);

    expect(chromeApi.alarms.clear).toHaveBeenCalledWith('refresh-feeds');
    expect(chromeApi.alarms.create).not.toHaveBeenCalled();
  });
});
