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

  it('serializes rapid saves and retains both changed fields', async () => {
    let finishFirst = () => {};
    const firstReply = new Promise<{ success: boolean }>((resolve) => {
      finishFirst = () => resolve({ success: true });
    });
    const client = {
      send: vi.fn().mockReturnValueOnce(firstReply).mockResolvedValue({ success: true }),
    };
    const store = createSettingsStore(client);
    const first = store.getState().updateSettings({ theme: 'dark' });
    const second = store.getState().updateSettings({ fontSize: 'large' });
    await Promise.resolve();

    expect(client.send).toHaveBeenCalledTimes(1);
    finishFirst();
    await Promise.all([first, second]);

    expect(store.getState().settings).toMatchObject({ theme: 'dark', fontSize: 'large' });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('does not let an earlier load overwrite a later requested save', async () => {
    let finishLoad = () => {};
    const loading = new Promise((resolve) => {
      finishLoad = () => resolve({ success: true, data: { settings: DEFAULT_SETTINGS } });
    });
    const client = {
      send: vi.fn().mockReturnValueOnce(loading).mockResolvedValue({ success: true }),
    };
    const store = createSettingsStore(client);
    const load = store.getState().loadSettings();
    const save = store.getState().updateSettings({ theme: 'dark' });
    await Promise.resolve();
    expect(client.send).toHaveBeenCalledTimes(1);

    finishLoad();
    await Promise.all([load, save]);

    expect(store.getState().settings.theme).toBe('dark');
    expect(store.getState().isLoading).toBe(false);
  });

  it('retains the latest value when the same field changes rapidly', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);

    await Promise.all([
      store.getState().updateSettings({ language: 'ja' }),
      store.getState().updateSettings({ language: 'zh-CN' }),
    ]);

    expect(store.getState().settings.language).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(i18n.language).toBe('zh-CN');
  });

  it('keeps confirmed preferences when reloading fails', async () => {
    const client = {
      send: vi.fn().mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'offline' }),
    };
    const store = createSettingsStore(client);
    await store.getState().updateSettings({ theme: 'dark' });

    await store.getState().loadSettings();

    expect(store.getState().settings.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.getState().error).toBe('offline');
    expect(store.getState().isLoading).toBe(false);
  });

  it('recovers the queue and clears an old error after a successful retry', async () => {
    const client = {
      send: vi.fn().mockRejectedValueOnce(new Error('runtime unavailable'))
        .mockResolvedValue({ success: true }),
    };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({ theme: 'dark' });
    expect(store.getState().settings.theme).toBe(DEFAULT_SETTINGS.theme);
    await store.getState().updateSettings({ theme: 'dark' });

    expect(store.getState().settings.theme).toBe('dark');
    expect(store.getState().error).toBeNull();
  });

  it('ends loading after a rejected read and still processes a later save', async () => {
    const client = {
      send: vi.fn().mockRejectedValueOnce(new Error('read unavailable'))
        .mockResolvedValue({ success: true }),
    };
    const store = createSettingsStore(client);

    await store.getState().loadSettings();
    expect(store.getState().isLoading).toBe(false);
    await store.getState().updateSettings({ theme: 'dark' });

    expect(store.getState().settings.theme).toBe('dark');
    expect(store.getState().error).toBeNull();
  });

  it('uses canonical saved values returned by the background', async () => {
    const saved = { ...DEFAULT_SETTINGS, ai: { ...DEFAULT_SETTINGS.ai, model: 'trimmed-model' } };
    const client = { send: vi.fn().mockResolvedValue({ success: true, data: { settings: saved } }) };
    const store = createSettingsStore(client);

    await store.getState().updateSettings({ ai: { ...DEFAULT_SETTINGS.ai, model: ' trimmed-model ' } });

    expect(store.getState().settings.ai.model).toBe('trimmed-model');
  });

  it('merges consecutive partial AI changes and sends only changed fields', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);

    await Promise.all([
      store.getState().updateSettings({ ai: { model: 'reader-model' } }),
      store.getState().updateSettings({ ai: { apiUrl: 'https://example.com/v1' } }),
    ]);

    expect(store.getState().settings.ai).toMatchObject({
      model: 'reader-model',
      apiUrl: 'https://example.com/v1',
      autoSummarizeMinCharacters: 1000,
    });
    expect(client.send).toHaveBeenLastCalledWith({
      type: 'SETTINGS_UPDATE',
      ai: { apiUrl: 'https://example.com/v1' },
    });
  });

  it('does not carry a failed AI edit into a later successful field update', async () => {
    const client = {
      send: vi.fn().mockResolvedValueOnce({ success: false, error: 'save failed' })
        .mockResolvedValue({ success: true }),
    };
    const store = createSettingsStore(client);

    await Promise.all([
      store.getState().updateSettings({ ai: { model: 'failed-model' } }),
      store.getState().updateSettings({ ai: { apiUrl: 'https://example.com/v1' } }),
    ]);

    expect(store.getState().settings.ai.model).toBe('');
    expect(store.getState().settings.ai.apiUrl).toBe('https://example.com/v1');
    expect(store.getState().error).toBeNull();
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
      send: vi.fn().mockResolvedValueOnce({
        success: true,
        data: { settings: legacySettings },
      }).mockResolvedValue({ success: true }),
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

  it.each([undefined, 'unknown-style'])('falls back to original article styling for %s', async (articleStyle) => {
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { settings: { ...DEFAULT_SETTINGS, articleStyle } },
      }),
    };
    const store = createSettingsStore(client);
    await store.getState().loadSettings();
    expect(store.getState().settings.articleStyle).toBe('default');
  });

  it('persists only the article style patch and keeps the other reading preferences', async () => {
    const client = { send: vi.fn().mockResolvedValue({ success: true }) };
    const store = createSettingsStore(client);
    await store.getState().updateSettings({ articleStyle: 'vue' });
    expect(client.send).toHaveBeenCalledWith({ type: 'SETTINGS_UPDATE', articleStyle: 'vue' });
    expect(store.getState().settings).toMatchObject({
      articleStyle: 'vue',
      colorTheme: DEFAULT_SETTINGS.colorTheme,
      readingFont: DEFAULT_SETTINGS.readingFont,
      fontSize: DEFAULT_SETTINGS.fontSize,
    });
    client.send.mockResolvedValue({ success: false });
    await store.getState().updateSettings({ articleStyle: 'github' });
    expect(store.getState().settings.articleStyle).toBe('vue');
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
