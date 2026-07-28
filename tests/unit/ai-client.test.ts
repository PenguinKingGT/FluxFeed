import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiRequestError, createOpenAiCompatibleClient } from '@/lib/ai';

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('OpenAI-compatible client', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends the configured model and optional bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: '{"overview":"Done","keyPoints":[]}' } }],
    }));
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/v1/chat/completions',
      model: 'reader-model',
      apiKey: 'secret',
      fetchImpl,
    });

    await expect(client.complete(
      [{ role: 'user', content: 'Hello' }],
      { maxTokens: 1200 },
    )).resolves.toContain('Done');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://ai.example/v1/chat/completions',
      expect.objectContaining({
        redirect: 'manual',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    );
    const options = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toMatchObject({
      model: 'reader-model',
      max_tokens: 1200,
    });
  });

  it('resolves an OpenAI-compatible base URL to the Chat Completions endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: 'Done' } }],
    }));
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://openrouter.ai/api/v1',
      model: 'reader-model',
      fetchImpl,
    });

    await client.complete([{ role: 'user', content: 'Hello' }]);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.any(Object),
    );
  });

  it.each([
    ['file:///tmp/model', 'AI_INVALID_URL'],
    ['not-a-url', 'AI_INVALID_URL'],
  ])('rejects unsupported URL %s', (apiUrl, code) => {
    expect(() => createOpenAiCompatibleClient({ apiUrl, model: 'x' })).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it.each([
    [401, 'AI_AUTH_FAILED'],
    [403, 'AI_AUTH_FAILED'],
    [429, 'AI_RATE_LIMITED'],
    [500, 'AI_REQUEST_FAILED'],
    [302, 'AI_REDIRECT_REJECTED'],
  ])('maps HTTP %s to %s', async (status, code) => {
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue(response({}, status)),
    });
    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({ code });
  });

  it('rejects a malformed completion response', async () => {
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue(response({ choices: [] })),
    });
    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toBeInstanceOf(AiRequestError);
  });

  it('does not send an authorization header when the API key is blank', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: 'Done' } }],
    }));
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      apiKey: '   ',
      fetchImpl,
    });

    await client.complete([{ role: 'user', content: 'x' }]);

    const options = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('maps a network rejection to AI_REQUEST_FAILED', async () => {
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });

    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 'AI_REQUEST_FAILED',
    });
  });

  it('aborts a slow request and maps it to AI_TIMEOUT', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string | URL | Request, options?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      })
    ));
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      timeoutMs: 25,
      fetchImpl: fetchImpl as typeof fetch,
    });

    const completion = client.complete([{ role: 'user', content: 'x' }]);
    const assertion = expect(completion).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(25);

    await assertion;
  });

  it('maps an abort while reading the response body to AI_TIMEOUT', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue({
        type: 'basic',
        status: 200,
        ok: true,
        text: vi.fn().mockRejectedValue(abortError),
      } as unknown as Response),
    });

    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 'AI_TIMEOUT',
    });
  });

  it('rejects an opaque redirect response', async () => {
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue({
        type: 'opaqueredirect',
        status: 0,
        ok: false,
      } as Response),
    });

    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 'AI_REDIRECT_REJECTED',
    });
  });

  it('rejects a response body larger than one MiB', async () => {
    const oversizedContent = 'x'.repeat(1024 * 1024);
    const client = createOpenAiCompatibleClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue(response({
        choices: [{ message: { content: oversizedContent } }],
      })),
    });

    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 'AI_RESPONSE_INVALID',
    });
  });
});
