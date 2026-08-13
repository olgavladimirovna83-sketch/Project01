import { IntegrationAuthError, IntegrationRateLimitError } from '@/integrations';

/**
 * Task 4.3 — устойчивость к сбоям для syncInstagramAccount
 * (42_IMPLEMENTATION_ROADMAP.md §24 RETRIES: timeout, retry, exponential
 * backoff, maximum attempts, failure state). Реализовано внутри
 * существующей синхронной функции, без очереди (по прямому требованию
 * Olga) — timeout сам по себе на уровне отдельного HTTP-запроса
 * см. src/integrations/providers/instagram.ts (fetchWithTimeout).
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5000;

/** Явное состояние "failure" после исчерпания попыток — не молчаливый
 * провал: содержит число попыток и исходную ошибку, а не просто
 * последнее сообщение. */
export class RetriesExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly cause: Error,
  ) {
    super(`failed after ${attempts} attempt(s): ${cause.message}`);
    this.name = 'RetriesExhaustedError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * IntegrationAuthError — terminal state (IntegrationProvider.ts, Task 3.1),
 * ретраить бессмысленно: токен одинаково не будет работать на следующей
 * попытке. Пробрасывается немедленно, не учитывается в maxAttempts.
 *
 * IntegrationRateLimitError.retryAfterSeconds, если платформа его вернула,
 * используется как задержка вместо расчётного backoff — более точный сигнал
 * от самой платформы (IntegrationProvider.ts, комментарий на классе).
 *
 * Любая другая ошибка (сетевая, timeout, 5xx) — считается временной и
 * ретраится с exponential backoff (baseDelayMs * 2^attempt, ограничено
 * maxDelayMs).
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof IntegrationAuthError) {
        throw error;
      }
      lastError = error as Error;
      if (attempt === maxAttempts) {
        break;
      }
      const hasRetryAfter =
        error instanceof IntegrationRateLimitError && typeof error.retryAfterSeconds === 'number';
      const delayMs = hasRetryAfter
        ? Math.min((error as IntegrationRateLimitError).retryAfterSeconds! * 1000, maxDelayMs)
        : Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delayMs);
    }
  }

  throw new RetriesExhaustedError(maxAttempts, lastError as Error);
}
