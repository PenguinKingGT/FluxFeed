import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import type { AiProvider } from '@/lib/types/settings';
import { AI_PROVIDER_BASE_URLS, normalizeAiProvider } from './provider-settings';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  APICallError,
  EmptyResponseBodyError,
  generateText,
  InvalidResponseDataError,
  JSONParseError,
  NoOutputGeneratedError,
  TypeValidationError,
} from 'ai';
import { AiRequestError } from './ai-errors';
import type { AiCompletionClient } from './completion';

export interface AiClientOptions {
  provider?: AiProvider;
  apiUrl: string;
  model: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const MAX_RESPONSE_BYTES = 1024 * 1024;

/** Validates destinations and expands compatible /v1 bases without altering native paths. */
function resolveEndpoint(apiUrl: string, provider: AiProvider): URL {
  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new AiRequestError('AI_INVALID_URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new AiRequestError('AI_INVALID_URL');
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (provider === 'openai-compatible' && path.endsWith('/v1')) {
    url.pathname = `${path}/chat/completions`;
  }
  return url;
}

/** Limits bytes while reading, before the SDK buffers and decodes untrusted JSON. */
async function readBoundedResponse(response: Response): Promise<Response> {
  if (!response.body) {
    throw new AiRequestError('AI_RESPONSE_INVALID');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new AiRequestError('AI_RESPONSE_INVALID');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/** Maps SDK errors without returning endpoint details, response bodies, or credentials. */
function mapCompletionError(error: unknown): AiRequestError {
  if (error instanceof AiRequestError) {
    return error;
  }
  if ((error instanceof Error || error instanceof DOMException) && error.name === 'AbortError') {
    return new AiRequestError('AI_TIMEOUT');
  }
  if (
    InvalidResponseDataError.isInstance(error)
    || JSONParseError.isInstance(error)
    || TypeValidationError.isInstance(error)
    || NoOutputGeneratedError.isInstance(error)
    || EmptyResponseBodyError.isInstance(error)
  ) {
    return new AiRequestError('AI_RESPONSE_INVALID');
  }
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return new AiRequestError('AI_AUTH_FAILED');
    }
    if (error.statusCode === 429) {
      return new AiRequestError('AI_RATE_LIMITED');
    }
    if (error.statusCode === 200) {
      return new AiRequestError('AI_RESPONSE_INVALID');
    }
    if (error.cause) {
      return mapCompletionError(error.cause);
    }
  }
  return new AiRequestError('AI_REQUEST_FAILED');
}

/**
 * Vercel AI SDK adapter. Only HTTP safety policy stays local; the SDK owns request
 * serialization and protocol parsing. Automatic retries are disabled so one
 * completion remains one billed attempt within article/digest request budgets.
 */
export function createAiCompletionClient({
  provider: selectedProvider,
  apiUrl,
  model,
  apiKey = '',
  fetchImpl = fetch,
  timeoutMs = 120000,
}: AiClientOptions): AiCompletionClient {
  const provider = normalizeAiProvider(selectedProvider);
  const url = resolveEndpoint(apiUrl.trim() || AI_PROVIDER_BASE_URLS[provider], provider);
  if (provider !== 'openai-compatible' && !apiKey.trim()) {
    throw new AiRequestError('AI_AUTH_FAILED');
  }

  /** Applies the same HTTP policy regardless of the selected native protocol. */
  const boundedFetch: typeof fetch = async (input, init) => {
    // Compatible URLs may be arbitrary complete endpoints. Native providers own
    // their path construction so models and Messages routes remain protocol-aware.
    const target = provider === 'openai-compatible' ? url.href : input;
    const response = await fetchImpl(target, { ...init, redirect: 'manual' });
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      throw new AiRequestError('AI_REDIRECT_REJECTED');
    }
    return readBoundedResponse(response);
  };

  const baseURL = url.href.replace(/\/+$/, '');
  /** Selects native serialization while preserving the shared completion interface. */
  function createModel() {
    switch (provider) {
      case 'google':
        return createGoogle({ baseURL, apiKey: apiKey.trim(), fetch: boundedFetch })(model);
      case 'anthropic':
        return createAnthropic({
          baseURL,
          apiKey: apiKey.trim(),
          // Requests run in the extension background using the user's own key.
          headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
          fetch: boundedFetch,
        })(model);
      case 'openai-compatible':
        return createOpenAICompatible({
          name: 'fluxfeed',
          baseURL: url.origin,
          apiKey: apiKey.trim() || undefined,
          fetch: boundedFetch,
        }).chatModel(model);
    }
  }
  const languageModel = createModel();

  return {
    /** Executes one non-streaming completion with a deadline covering body reads. */
    async complete(messages, completionOptions) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const result = await generateText({
          model: languageModel,
          // SDK 7 separates trusted instructions from source messages.
          instructions: messages
            .filter((message) => message.role === 'system')
            .map((message) => message.content)
            .join('\n\n') || undefined,
          messages: messages
            .filter((message) => message.role === 'user')
            .map((message) => ({ role: 'user' as const, content: message.content })),
          temperature: 0.2,
          maxOutputTokens: completionOptions?.maxTokens,
          maxRetries: 0,
          abortSignal: controller.signal,
          telemetry: { isEnabled: false },
        });
        if (!result.text.trim()) {
          throw new AiRequestError('AI_RESPONSE_INVALID');
        }
        return result.text;
      } catch (error) {
        if (controller.signal.aborted) {
          throw new AiRequestError('AI_TIMEOUT');
        }
        throw mapCompletionError(error);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
