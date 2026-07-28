import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { i18n } from '@/lib/i18n';
import { applyTheme, createSettingsStore } from '@/store/settingsStore';

describe('settings store', () => {
  let mediaListeners: Array<(event: MediaQueryListEvent) => void>;
  let prefersDark: boolean;

  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-color-theme');
    document.documentElement.removeAttribute('data-reading-font');
    document.documentElement.removeAttribute('data-interface-font');
    mediaListeners = [];
    prefersDark = false;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() {
        return prefersDark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.push(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaListeners = mediaListeners.filter((candidate) => candidate !== listener);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    applyTheme('light');
  });

  it('loads settings and applies theme', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { settings: { ...DEFAULT_SETTINGS, theme: 'dark' } },
      }),
    };
    const store = createSettingsStore(client);

    await store.getState().loadSettings();

    expect(client.send).toHaveBeenCalledWith({ action: 'SETTINGS_GET' });
    expect(store.getState().settings.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.colorTheme).toBe('quiet-signal');
  });

  it('updates settings and applies dark theme immediately', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({ theme: 'dark' });

    expect(client.send).toHaveBeenCalledWith({
      type: 'SETTINGS_UPDATE',
      theme: 'dark',
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('updates the color theme without changing the appearance mode', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({ colorTheme: 'graphite' });

    expect(client.send).toHaveBeenCalledWith({
      type: 'SETTINGS_UPDATE',
      colorTheme: 'graphite',
    });
    expect(store.getState().settings.theme).toBe('system');
    expect(document.documentElement.dataset.colorTheme).toBe('graphite');
  });

  it('updates retention days', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({ retentionDays: 30 });

    expect(store.getState().settings.retentionDays).toBe(30);
  });

  it('applies reading and interface fonts immediately', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({
      readingFont: 'lxgw-wenkai',
      interfaceFont: 'lxgw-wenkai',
    });

    expect(document.documentElement.dataset.readingFont).toBe('lxgw-wenkai');
    expect(document.documentElement.dataset.interfaceFont).toBe('lxgw-wenkai');
  });

  it('keeps the confirmed setting value when saving fails', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: false, error: 'storage unavailable' }) };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({ retentionDays: 30 });

    expect(store.getState().settings.retentionDays).toBe(DEFAULT_SETTINGS.retentionDays);
    expect(store.getState().error).toBe('storage unavailable');
  });

  it('loads legacy settings with English and switches language immediately', async () => {
    const {
      language: _language,
      colorTheme: _colorTheme,
      readingFont: _readingFont,
      interfaceFont: _interfaceFont,
      ...legacySettings
    } = DEFAULT_SETTINGS;
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { settings: legacySettings },
      }),
    };
    const store = createSettingsStore(client);

    await store.getState().loadSettings();
    expect(store.getState().settings.language).toBe('en');
    expect(store.getState().settings.colorTheme).toBe('quiet-signal');
    expect(store.getState().settings.readingFont).toBe('system-serif');
    expect(store.getState().settings.interfaceFont).toBe('system-sans');
    expect(document.documentElement.dataset.readingFont).toBe('system-serif');
    expect(document.documentElement.dataset.interfaceFont).toBe('system-sans');
    expect(document.documentElement.dataset.colorTheme).toBe('quiet-signal');

    await store.getState().updateSettings({ language: 'ja' });
    expect(i18n.language).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
  });

  it('applies light theme by removing dark class', () => {
    document.documentElement.classList.add('dark');

    applyTheme('light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.colorTheme).toBe('quiet-signal');
  });

  it('normalizes unknown color themes to the default', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { settings: { ...DEFAULT_SETTINGS, colorTheme: 'unknown-theme' } },
      }),
    };
    const store = createSettingsStore(client);

    await store.getState().loadSettings();

    expect(store.getState().settings.colorTheme).toBe('quiet-signal');
    expect(document.documentElement.dataset.colorTheme).toBe('quiet-signal');
  });

  it('tracks system theme changes and removes the listener for fixed themes', () => {
    applyTheme('system', 'forest');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.colorTheme).toBe('forest');
    expect(mediaListeners).toHaveLength(1);

    prefersDark = true;
    mediaListeners[0]({ matches: true } as MediaQueryListEvent);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.colorTheme).toBe('forest');

    applyTheme('light');

    expect(mediaListeners).toHaveLength(0);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('does not register duplicate system listeners', () => {
    applyTheme('system');
    applyTheme('system');

    expect(mediaListeners).toHaveLength(1);
  });
});
