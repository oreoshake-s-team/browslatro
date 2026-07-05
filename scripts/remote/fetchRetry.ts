export interface RetryOptions {
  readonly retries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
  readonly onRetry?: (attempt: number, reason: string) => void;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function describeError(error: unknown): string {
  const cause = (error as { cause?: { code?: string } } | undefined)?.cause;
  if (cause?.code !== undefined) return cause.code;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function backoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.round(exponential * (0.5 + 0.5 * random()));
}

/**
 * Wraps a fetch call with exponential-backoff retries on transient failures:
 * thrown network errors (connect timeouts, resets — fetch only throws on the
 * network layer, never on HTTP status) and 429/5xx responses. 4xx responses are
 * returned as-is so callers keep handling not-found/permission themselves. The
 * request is re-sent verbatim, so bodies must be buffers, not one-shot streams.
 */
export async function fetchWithRetry(
  fetchImpl: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  options: RetryOptions = {},
): Promise<Response> {
  const retries = options.retries ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      if (attempt < retries && isRetryableStatus(response.status)) {
        options.onRetry?.(attempt + 1, `status ${response.status}`);
        await sleep(backoffDelayMs(attempt, baseDelayMs, maxDelayMs, random));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      options.onRetry?.(attempt + 1, describeError(error));
      await sleep(backoffDelayMs(attempt, baseDelayMs, maxDelayMs, random));
    }
  }
  throw lastError;
}
