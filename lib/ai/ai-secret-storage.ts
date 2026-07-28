const API_KEY_STORAGE_KEY = 'fluxfeed.ai.apiKey.v1';

export interface AiSecretStorage {
  hasApiKey(): Promise<boolean>;
  getApiKey(): Promise<string>;
  setApiKey(value: string): Promise<void>;
  clearApiKey(): Promise<void>;
}

export interface ExtensionLocalStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createAiSecretStorage(storage: ExtensionLocalStorage): AiSecretStorage {
  return {
    async hasApiKey() {
      return Boolean((await this.getApiKey()).trim());
    },

    async getApiKey() {
      const value = (await storage.get(API_KEY_STORAGE_KEY))[API_KEY_STORAGE_KEY];
      return typeof value === 'string' ? value : '';
    },

    async setApiKey(value) {
      const trimmed = value.trim();
      if (!trimmed) {
        await storage.remove(API_KEY_STORAGE_KEY);
        return;
      }
      await storage.set({ [API_KEY_STORAGE_KEY]: trimmed });
    },

    async clearApiKey() {
      await storage.remove(API_KEY_STORAGE_KEY);
    },
  };
}

