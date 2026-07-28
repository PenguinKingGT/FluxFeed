import { describe, expect, it, vi } from 'vitest';
import { createRuntimeMessageClient } from '@/store/message-client';

describe('store message client', () => {
  it('sends messages through injected runtime', async () => {
    const runtime = { sendMessage: vi.fn().mockResolvedValue({ success: true }) };
    const client = createRuntimeMessageClient(runtime);

    const response = await client.send({ action: 'FEED_LIST' });

    expect(runtime.sendMessage).toHaveBeenCalledWith({ action: 'FEED_LIST' });
    expect(response).toEqual({ success: true });
  });

  it('converts runtime promise rejection into a stable failure response', async () => {
    const runtime = {
      sendMessage: vi.fn().mockRejectedValue(new Error('Extension context invalidated')),
    };
    const client = createRuntimeMessageClient(runtime);

    await expect(client.send({ action: 'FEED_LIST' })).resolves.toEqual({
      success: false,
      error: 'Extension context invalidated',
    });
  });

  it('normalizes non-Error runtime rejections', async () => {
    const client = createRuntimeMessageClient({
      sendMessage: vi.fn().mockRejectedValue('Service worker unavailable'),
    });

    await expect(client.send({ action: 'SETTINGS_GET' })).resolves.toEqual({
      success: false,
      error: 'Service worker unavailable',
    });
  });
});
