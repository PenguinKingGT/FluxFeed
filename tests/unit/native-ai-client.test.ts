import { describe, expect, it, vi } from 'vitest';
import { createAiCompletionClient } from '@/lib/ai/ai-client';
import { AI_PROVIDER_BASE_URLS } from '@/lib/ai/provider-settings';

const providers = [
  {
    provider: 'google' as const,
    model: 'gemini-2.5-flash',
    path: '/models/gemini-2.5-flash:generateContent',
    keyHeader: 'x-goog-api-key',
    response: {
      candidates: [{ content: { role: 'model', parts: [{ text: 'Done' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3, totalTokenCount: 13 },
    },
  },
  {
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-5',
    path: '/messages',
    keyHeader: 'x-api-key',
    response: {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5',
      content: [{ type: 'text', text: 'Done' }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 3 },
    },
  },
];

describe.each(providers)('$provider native SDK adapter', (fixture) => {
  it('uses the native route, authentication, system instructions, and output limit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture.response)));
    const client = createAiCompletionClient({
      provider: fixture.provider,
      apiUrl: '',
      model: fixture.model,
      apiKey: 'provider-test-key',
      fetchImpl,
    });
    await expect(client.complete([
      { role: 'system', content: 'Trusted summary instructions.' },
      { role: 'user', content: 'Untrusted source text.' },
    ], { maxTokens: 1024 })).resolves.toBe('Done');

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, options] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(AI_PROVIDER_BASE_URLS[fixture.provider] + fixture.path);
    const headers = new Headers(options.headers);
    expect(headers.get(fixture.keyHeader)).toBe('provider-test-key');
    expect(headers.get('authorization')).toBeNull();
    expect(options.redirect).toBe('manual');
    const body = JSON.parse(String(options.body));
    if (fixture.provider === 'google') {
      expect(body.generationConfig.maxOutputTokens).toBe(1024);
      expect(body.systemInstruction.parts[0].text).toBe('Trusted summary instructions.');
      expect(body.contents[0].parts[0].text).toBe('Untrusted source text.');
    } else {
      expect(body.max_tokens).toBe(1024);
      expect(body.system[0].text).toBe('Trusted summary instructions.');
      expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
      expect(headers.get('anthropic-version')).toBeTruthy();
    }
  });

  it('supports a custom native base URL without converting to Chat Completions', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture.response)));
    const client = createAiCompletionClient({
      provider: fixture.provider,
      apiUrl: 'https://proxy.example/native',
      model: fixture.model,
      apiKey: 'test-key',
      fetchImpl,
    });
    await client.complete([{ role: 'user', content: 'Hello' }]);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://proxy.example/native' + fixture.path);
  });

  it('requires its own key rather than falling back to an SDK environment variable', () => {
    expect(() => createAiCompletionClient({
      provider: fixture.provider,
      apiUrl: '',
      model: fixture.model,
    })).toThrowError(expect.objectContaining({ code: 'AI_AUTH_FAILED' }));
  });

  it.each([
    [401, 'AI_AUTH_FAILED'],
    [429, 'AI_RATE_LIMITED'],
    [500, 'AI_REQUEST_FAILED'],
    [302, 'AI_REDIRECT_REJECTED'],
  ])('maps HTTP %s safely and makes no hidden retries', async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status }));
    const client = createAiCompletionClient({
      provider: fixture.provider,
      apiUrl: '',
      model: fixture.model,
      apiKey: 'test-key',
      fetchImpl,
    });
    await expect(client.complete([{ role: 'user', content: 'Hello' }])).rejects.toMatchObject({ code });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
