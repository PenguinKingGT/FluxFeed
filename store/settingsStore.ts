import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { applyLanguage } from '@/lib/i18n';
import { applyFontPreferences } from '@/lib/settings/font-preferences';
import { normalizeColorTheme } from '@/lib/theme/theme-presets';
import { applyTheme } from '@/lib/theme/theme-controller';
import type { Settings } from '@/lib/types';
import { messageClient, type StoreMessageClient } from './message-client';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  loadSettings(): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
}

export function createSettingsStore(client: StoreMessageClient) {
  return createStore<SettingsState>((set, get) => ({
    settings: DEFAULT_SETTINGS,
    isLoading: false,
    error: null,

    async loadSettings() {
      set({ isLoading: true, error: null });
      const response = await client.send<{ settings: Settings }>({ action: 'SETTINGS_GET' });
      const settings = {
        ...DEFAULT_SETTINGS,
        ...(response.success ? response.data?.settings : undefined),
        colorTheme: normalizeColorTheme(response.success ? response.data?.settings.colorTheme : undefined),
        id: 'global' as const,
      };
      set({
        settings,
        isLoading: false,
        error: response.success ? null : response.error ?? 'Failed to load settings',
      });
      applyTheme(settings.theme, settings.colorTheme);
      applyFontPreferences(settings.readingFont, settings.interfaceFont);
      await applyLanguage(settings.language);
    },

    async updateSettings(patch) {
      const settings = { ...get().settings, ...patch, id: 'global' as const };
      const response = await client.send({ type: 'SETTINGS_UPDATE', ...patch });
      if (!response.success) {
        set({ error: response.error ?? 'Failed to save settings' });
        return;
      }
      set({ settings });
      applyTheme(settings.theme, settings.colorTheme);
      applyFontPreferences(settings.readingFont, settings.interfaceFont);
      await applyLanguage(settings.language);
    },
  }));
}

export const settingsStore = createSettingsStore(messageClient);
export { applyFontPreferences, applyTheme };
export function useSettingsStore<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
