import type { AiProvider } from '@/lib/types/settings';
const API_KEY_STORAGE_KEY = 'fluxfeed.ai.apiKey.v1';

export interface AiSecretStorage {
  hasApiKey(provider?: AiProvider): Promise<boolean>;
  getApiKey(provider?: AiProvider): Promise<string>;
  setApiKey(value: string, provider?: AiProvider): Promise<void>;
  clearApiKey(provider?: AiProvider): Promise<void>;
}

export interface ExtensionLocalStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Preserves the original compatible key while isolating native provider credentials. */
function storageKey(provider: AiProvider): string {
  return provider === 'openai-compatible'
    ? API_KEY_STORAGE_KEY
    : `${API_KEY_STORAGE_KEY}.${provider}`;
}

/** Stores secrets by provider; no native provider falls back to the legacy key. */
export function createAiSecretStorage(storage: ExtensionLocalStorage): AiSecretStorage {
  return {
    /** Exposes presence only to callers that do not need the credential itself. */
    async hasApiKey(provider = 'openai-compatible') {
      return Boolean((await this.getApiKey(provider)).trim());
    },

    /** Reads only the selected provider's local credential. */
    async getApiKey(provider = 'openai-compatible') {
      const key = storageKey(provider);
      const value = (await storage.get(key))[key];
      return typeof value === 'string' ? value : '';
    },

    /** Empty values remove the selected credential without affecting other providers. */
    async setApiKey(value, provider = 'openai-compatible') {
      const trimmed = value.trim();
      const key = storageKey(provider);
      if (!trimmed) {
        await storage.remove(key);
        return;
      }
      await storage.set({ [key]: trimmed });
    },

    /** Clears only the selected provider's local credential. */
    async clearApiKey(provider = 'openai-compatible') {
      await storage.remove(storageKey(provider));
    },
  };
}
