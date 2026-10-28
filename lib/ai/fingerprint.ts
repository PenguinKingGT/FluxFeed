export const AI_PROMPT_VERSION = 1 as const;

/** Hashes source data and preferences without retaining them in cache keys. */
export async function createFingerprint(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

