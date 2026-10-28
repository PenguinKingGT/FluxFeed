import type { AiProvider } from '@/lib/types/settings';
import { AiRequestError } from './ai-errors';

export const AI_PROVIDERS = ['openai-compatible', 'google', 'anthropic'] as const;

export const AI_PROVIDER_BASE_URLS: Record<AiProvider, string> = {
  'openai-compatible': '',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1',
};

/** Missing provider identifies legacy compatible settings; unknown values fail closed. */
export function normalizeAiProvider(value: unknown): AiProvider {
  if (value === undefined) {
    return 'openai-compatible';
  }
  if (value === 'openai-compatible' || value === 'google' || value === 'anthropic') {
    return value;
  }
  throw new AiRequestError('AI_REQUEST_INVALID');
}
