import { describe, expect, it, vi } from 'vitest';
import { handleInstall } from '@/entrypoints/background/install';

describe('background install handler', () => {
  it('initializes database defaults and registers refresh alarm on install', async () => {
    const ensureDatabaseDefaults = vi.fn();
    const getSettings = vi.fn().mockResolvedValue({ refreshInterval: 45 });
    const registerRefreshAlarm = vi.fn();

    await handleInstall(
      { reason: 'install' },
      {
        ensureDatabaseDefaults,
        getSettings,
        registerRefreshAlarm,
      },
    );

    expect(ensureDatabaseDefaults).toHaveBeenCalled();
    expect(registerRefreshAlarm).toHaveBeenCalledWith(45);
  });

  it('registers refresh alarm after extension update without resetting defaults', async () => {
    const ensureDatabaseDefaults = vi.fn();
    const getSettings = vi.fn().mockResolvedValue({ refreshInterval: 30 });
    const registerRefreshAlarm = vi.fn();

    await handleInstall(
      { reason: 'update' },
      {
        ensureDatabaseDefaults,
        getSettings,
        registerRefreshAlarm,
      },
    );

    expect(ensureDatabaseDefaults).not.toHaveBeenCalled();
    expect(registerRefreshAlarm).toHaveBeenCalledWith(30);
  });
});
