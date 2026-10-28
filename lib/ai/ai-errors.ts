export type AiErrorCode =
  | 'AI_INVALID_URL'
  | 'AI_AUTH_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_REDIRECT_REJECTED'
  | 'AI_RESPONSE_INVALID'
  | 'AI_REQUEST_FAILED'
  | 'AI_REQUEST_INVALID'
  | 'AI_NOT_CONFIGURED'
  | 'AI_PARTIAL_CONFIRMATION_REQUIRED'
  | 'AI_AUTO_SUMMARY_DISABLED'
  | 'AI_AUTO_SUMMARY_BELOW_THRESHOLD'
  | 'ARTICLE_NOT_FOUND'
  | 'ARTICLE_CONTENT_TOO_SHORT'
  | 'DAILY_DIGEST_INVALID_DATE'
  | 'DAILY_DIGEST_EMPTY';

/** Carries only a safe product error code across the AI module's interface. */
export class AiRequestError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(code);
    this.name = 'AiRequestError';
  }
}
