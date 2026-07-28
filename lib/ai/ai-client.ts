export type AiErrorCode =
  | 'AI_INVALID_URL'
  | 'AI_AUTH_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_REDIRECT_REJECTED'
  | 'AI_RESPONSE_INVALID'
  | 'AI_REQUEST_FAILED';

export class AiRequestError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(code);
    this.name = 'AiRequestError';
  }
}

export interface AiMessage {
  role: 'system' | 'user';
  content: string;
}

export interface AiCompletionClient {
  complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string>;
}

export interface AiCompletionOptions {
  maxTokens?: number;
}

export interface AiClientOptions {
  apiUrl: string;
  model: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const MAX_RESPONSE_LENGTH = 1024 * 1024;

function resolveChatCompletionsUrl(apiUrl: string): URL {
  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new AiRequestError('AI_INVALID_URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AiRequestError('AI_INVALID_URL');
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/v1')) {
    url.pathname = `${path}/chat/completions`;
  }
  return url;
}

export function createOpenAiCompatibleClient({
  apiUrl,
  model,
  apiKey = '',
  fetchImpl = fetch,
  timeoutMs = 120000,
}: AiClientOptions): AiCompletionClient {
  const url = resolveChatCompletionsUrl(apiUrl);

  return {
    async complete(messages, completionOptions) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
        const body: Record<string, unknown> = { model, messages, temperature: 0.2 };
        if (completionOptions?.maxTokens) {
          body.max_tokens = completionOptions.maxTokens;
        }

        const response = await fetchImpl(url.href, {
          method: 'POST',
          headers,
          redirect: 'manual',
          signal: controller.signal,
          body: JSON.stringify(body),
        });

        if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
          throw new AiRequestError('AI_REDIRECT_REJECTED');
        }
        if (response.status === 401 || response.status === 403) {
          throw new AiRequestError('AI_AUTH_FAILED');
        }
        if (response.status === 429) {
          throw new AiRequestError('AI_RATE_LIMITED');
        }
        if (!response.ok) {
          throw new AiRequestError('AI_REQUEST_FAILED');
        }

        const text = await response.text();
        if (text.length > MAX_RESPONSE_LENGTH) {
          throw new AiRequestError('AI_RESPONSE_INVALID');
        }
        try {
          const data = JSON.parse(text) as {
            choices?: Array<{ message?: { content?: unknown } }>;
          };
          const content = data.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || !content.trim()) {
            throw new AiRequestError('AI_RESPONSE_INVALID');
          }
          return content;
        } catch (error) {
          if (error instanceof AiRequestError) throw error;
          throw new AiRequestError('AI_RESPONSE_INVALID');
        }
      } catch (error) {
        if (error instanceof AiRequestError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new AiRequestError('AI_TIMEOUT');
        }
        throw new AiRequestError('AI_REQUEST_FAILED');
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
