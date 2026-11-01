import { FeedFetchError } from './feed-errors';

export const MAX_FEED_RESPONSE_BYTES = 20 * 1024 * 1024;

/** Checks elapsed time as well as abort, including synchronous work between network awaits. */
export function checkFeedDeadline(signal: AbortSignal, deadline: number): void {
  if (signal.aborted || Date.now() >= deadline) {
    throw new FeedFetchError('FEED_TIMEOUT');
  }
}

/** Cancels unused bodies without letting an untrusted cancellation promise block completion. */
export function cancelFeedBody(response: Response): void {
  if (response.body && !response.body.locked) {
    // Cleanup rejection must not replace the original result or leave an unhandled rejection.
    void response.body.cancel().catch(() => undefined);
  }
}

/** Reads decoded transport bytes within the shared deadline and a fixed maximum allocation. */
export async function readFeedResponse(
  response: Response,
  signal: AbortSignal,
  deadline: number,
): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_FEED_RESPONSE_BYTES) {
    throw new FeedFetchError('FEED_RESPONSE_TOO_LARGE');
  }
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  let bytes = new Uint8Array(64 * 1024);
  let length = 0;
  let completed = false;
  /** Aborts pending reads promptly without awaiting the source's cancellation implementation. */
  function cancel(): void {
    void reader.cancel().catch(() => undefined);
  }
  signal.addEventListener('abort', cancel, { once: true });

  try {
    while (true) {
      checkFeedDeadline(signal, deadline);
      const { done, value } = await reader.read();
      checkFeedDeadline(signal, deadline);
      if (done) {
        completed = true;
        break;
      }
      const nextLength = length + value.byteLength;
      if (nextLength > MAX_FEED_RESPONSE_BYTES) {
        throw new FeedFetchError('FEED_RESPONSE_TOO_LARGE');
      }
      if (nextLength > bytes.byteLength) {
        // Growing one bounded buffer avoids an unbounded number of tiny chunk objects.
        const capacity = Math.min(MAX_FEED_RESPONSE_BYTES, Math.max(nextLength, bytes.byteLength * 2));
        const expanded = new Uint8Array(capacity);
        expanded.set(bytes.subarray(0, length));
        bytes = expanded;
      }
      bytes.set(value, length);
      length = nextLength;
    }
    return new TextDecoder().decode(bytes.subarray(0, length));
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!completed) {
      cancel();
    }
    reader.releaseLock();
  }
}
