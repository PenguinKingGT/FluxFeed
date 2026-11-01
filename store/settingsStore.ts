import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { normalizeArticleStyle } from '@/lib/reader/article-styles';
import { applyLanguage } from '@/lib/i18n';
import { applyFontPreferences } from '@/lib/settings/font-preferences';
import { normalizeColorTheme } from '@/lib/theme/theme-presets';
import { applyTheme } from '@/lib/theme/theme-controller';
import type { Settings, SettingsPatch } from '@/lib/types';
import { mergeSettings } from '@/lib/settings/settings-values';
import { messageClient, type StoreMessageClient } from './message-client';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  loadSettings(): Promise<void>;
  updateSettings(patch: SettingsPatch): Promise<void>;
}

/** Completes legacy values and normalizes reader-specific preference identifiers. */
function normalizeSettings(settings?: Settings): Settings {
  const completed = mergeSettings(settings);
  return {
    ...completed,
    articleStyle: normalizeArticleStyle(completed.articleStyle),
    colorTheme: normalizeColorTheme(completed.colorTheme),
  };
}

/** Serializes loads, saves, and presentation effects so earlier requests cannot publish late. */
export function createSettingsStore(client: StoreMessageClient) {
  let queue = Promise.resolve();

  /** Preserves invocation order and keeps an unexpected rejection from blocking later work. */
  function enqueue(operation: () => Promise<void>): Promise<void> {
    const task = queue.then(operation);
    queue = task.catch(() => undefined);
    return task;
  }

  return createStore<SettingsState>((set, get) => {
    /** Publishes confirmed values and finishes language effects before the next operation. */
    async function publish(settings: Settings): Promise<void> {
      set({ settings, error: null });
      applyTheme(settings.theme, settings.colorTheme);
      applyFontPreferences(settings.readingFont, settings.interfaceFont);
      await applyLanguage(settings.language);
    }

    return {
      settings: mergeSettings(),
      isLoading: false,
      error: null,

      /** Queues reads with writes; failed reloads retain the last confirmed preferences. */
      loadSettings() {
        return enqueue(async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await client.send<{ settings: Settings }>({ action: 'SETTINGS_GET' });
            if (!response.success || !response.data?.settings) {
              set({ error: response.error ?? 'Failed to load settings' });
              return;
            }
            await publish(normalizeSettings(response.data.settings));
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to load settings' });
          } finally {
            set({ isLoading: false });
          }
        });
      },

      /** Saves only the patch; failures leave confirmed values unchanged and remain retryable. */
      updateSettings(patch) {
        const normalizedPatch: SettingsPatch = {
          ...patch,
          ...(patch.ai ? { ai: { ...patch.ai } } : {}),
        };
        if ('articleStyle' in normalizedPatch) {
          normalizedPatch.articleStyle = normalizeArticleStyle(normalizedPatch.articleStyle);
        }

        return enqueue(async () => {
          set({ error: null });
          try {
            const response = await client.send<{ settings: Settings }>({
              type: 'SETTINGS_UPDATE',
              ...normalizedPatch,
            });
            if (!response.success) {
              set({ error: response.error ?? 'Failed to save settings' });
              return;
            }
            // Legacy acknowledgements without settings still merge against the current confirmed state.
            const settings = response.data?.settings ?? mergeSettings(get().settings, normalizedPatch);
            await publish(normalizeSettings(settings));
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to save settings' });
          }
        });
      },
    };
  });
}

export const settingsStore = createSettingsStore(messageClient);
export { applyFontPreferences, applyTheme };
export function useSettingsStore<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
