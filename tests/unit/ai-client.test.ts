import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiRequestError, createAiCompletionClient } from '@/lib/ai';

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
    const client = createAiCompletionClient({
      apiUrl: 'https://ai.example/v1/chat/completions',
      model: 'reader-model',
      apiKey: 'secret',
      fetchImpl,
    });

    await expect(client.complete(
      [
        { role: 'system', content: 'Summarize only the supplied source.' },
        { role: 'user', content: 'Hello' },
      ],
      { maxTokens: 1200 },
    )).resolves.toContain('Done');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://ai.example/v1/chat/completions',
      expect.objectContaining({
        redirect: 'manual',
      }),
    );
    const options = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).get('authorization')).toBe('Bearer secret');
    expect(JSON.parse(String(options.body))).toMatchObject({
      model: 'reader-model',
      max_tokens: 1200,
      messages: [
        { role: 'system', content: 'Summarize only the supplied source.' },
        { role: 'user', content: 'Hello' },
      ],
    });
  });

  it('resolves an OpenAI-compatible base URL to the Chat Completions endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: 'Done' } }],
    }));
    const client = createAiCompletionClient({
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
    expect(() => createAiCompletionClient({ apiUrl, model: 'x' })).toThrowError(
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
    const client = createAiCompletionClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue(response({}, status)),
    });
    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({ code });
  });

  it('rejects a malformed completion response', async () => {
    const client = createAiCompletionClient({
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
    const client = createAiCompletionClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      apiKey: '   ',
      fetchImpl,
    });

    await client.complete([{ role: 'user', content: 'x' }]);

    const options = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).get('authorization')).toBeNull();
    expect(new Headers(options.headers).get('content-type')).toBe('application/json');
  });

  it('maps a network rejection to AI_REQUEST_FAILED', async () => {
    const client = createAiCompletionClient({
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
    const client = createAiCompletionClient({
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
    const client = createAiCompletionClient({
      apiUrl: 'https://ai.example/chat',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue(new Response(new ReadableStream({
        start(controller) {
          controller.error(abortError);
        },
      }))),
    });

    await expect(client.complete([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 'AI_TIMEOUT',
    });
  });

  it('rejects an opaque redirect response', async () => {
    const client = createAiCompletionClient({
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
    const client = createAiCompletionClient({
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

  it.each([429, 500])('never retries HTTP %s behind the request budget', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, status));
    const client = createAiCompletionClient({ apiUrl: 'https://example.com/v1', model: 'x', fetchImpl });
    await expect(client.complete([{ role: 'user', content: 'Hello' }])).rejects.toBeInstanceOf(AiRequestError);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('preserves a custom full endpoint and query parameters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: 'Done' } }],
    }));
    const apiUrl = 'https://example.com/custom/generate?version=2';
    const client = createAiCompletionClient({ apiUrl, model: 'x', fetchImpl });
    await client.complete([{ role: 'user', content: 'Hello' }]);
    expect(fetchImpl).toHaveBeenCalledWith(apiUrl, expect.any(Object));
  });

  it('cancels an oversized streaming body before reading further chunks', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024 + 1));
      },
      cancel,
    });
    const client = createAiCompletionClient({
      apiUrl: 'https://example.com/v1',
      model: 'x',
      fetchImpl: vi.fn().mockResolvedValue(new Response(body)),
    });
    await expect(client.complete([{ role: 'user', content: 'Hello' }])).rejects.toMatchObject({
      code: 'AI_RESPONSE_INVALID',
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

});
