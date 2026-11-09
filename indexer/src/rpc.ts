/** Highest transaction version this indexer can read: legacy, v0, and v1. */
export const MAX_SUPPORTED_TRANSACTION_VERSION = 1;

export const RPC_MAX_RETRIES = 6;
export const RPC_RETRY_BASE_MS = 500;
export const RPC_RETRY_MAX_MS = 16_000;

export const TX_READ_CONFIG = {
  commitment: 'confirmed' as const,
  maxSupportedTransactionVersion: MAX_SUPPORTED_TRANSACTION_VERSION,
};

export interface RetryHooks {
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  retry?: (error: unknown, attempt: number) => boolean;
}

export function isRateLimitError(error: unknown): boolean {
  if (error == null) return false;
  const err = error as { code?: number | string; message?: string; cause?: unknown; status?: number };
  if (err.code === 429 || err.status === 429) return true;
  if (typeof err.message === 'string' && /429|too many requests/i.test(err.message)) return true;
  if (err.cause) return isRateLimitError(err.cause);
  return false;
}

export function backoffDelayMs(
  attempt: number,
  baseMs = RPC_RETRY_BASE_MS,
  maxMs = RPC_RETRY_MAX_MS,
  random: () => number = Math.random,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jittered = exp * (0.5 + random());
  return Math.max(0, Math.min(maxMs, Math.floor(jittered)));
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRpcRetry<T>(fn: () => Promise<T>, hooks: RetryHooks = {}): Promise<T> {
  const retries = hooks.retries ?? RPC_MAX_RETRIES;
  const retry = hooks.retry ?? isRateLimitError;
  const sleep = hooks.sleep ?? defaultSleep;
  const random = hooks.random ?? Math.random;
  const baseMs = hooks.baseMs ?? RPC_RETRY_BASE_MS;
  const maxMs = hooks.maxMs ?? RPC_RETRY_MAX_MS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !retry(error, attempt)) throw error;
      await sleep(backoffDelayMs(attempt, baseMs, maxMs, random));
    }
  }
  throw lastError;
}
