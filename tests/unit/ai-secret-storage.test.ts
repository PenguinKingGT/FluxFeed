import { describe, expect, it, vi } from 'vitest';
import { createAiSecretStorage } from '@/lib/ai';

describe('AI secret storage', () => {
  it('stores, reports, and clears a key without exposing other values', async () => {
    const values: Record<string, unknown> = {};
    const storage = {
      get: vi.fn(async (key: string) => ({ [key]: values[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(values, items); }),
      remove: vi.fn(async (key: string) => { delete values[key]; }),
    };
    const secrets = createAiSecretStorage(storage);

    expect(await secrets.hasApiKey()).toBe(false);
    await secrets.setApiKey('  test-key  ');
    expect(await secrets.hasApiKey()).toBe(true);
    expect(await secrets.getApiKey()).toBe('test-key');

    await secrets.setApiKey('');
    expect(await secrets.hasApiKey()).toBe(false);
    expect(storage.remove).toHaveBeenCalled();
  });
});
