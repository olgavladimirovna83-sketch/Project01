import { describe, expect, it, vi } from 'vitest';
import { IntegrationAuthError, IntegrationRateLimitError } from '../../src/integrations';
import { RetriesExhaustedError, withRetry } from '../../src/ingestion/retry';

// baseDelayMs/maxDelayMs малы во всех тестах — тест устойчивости к сбоям не
// должен реально ждать секунды exponential backoff.
const FAST_OPTIONS = { baseDelayMs: 1, maxDelayMs: 5 };

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, FAST_OPTIONS);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures and succeeds once they stop', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, FAST_OPTIONS);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry IntegrationAuthError — terminal state', async () => {
    const fn = vi.fn().mockRejectedValue(new IntegrationAuthError('instagram', 'token revoked'));
    await expect(withRetry(fn, FAST_OPTIONS)).rejects.toThrow(IntegrationAuthError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws RetriesExhaustedError with attempt count once maxAttempts is reached', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { ...FAST_OPTIONS, maxAttempts: 3 })).rejects.toMatchObject({
      name: 'RetriesExhaustedError',
      attempts: 3,
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('preserves the original error as .cause on RetriesExhaustedError', async () => {
    const original = new Error('boom');
    const fn = vi.fn().mockRejectedValue(original);
    try {
      await withRetry(fn, { ...FAST_OPTIONS, maxAttempts: 2 });
      expect.unreachable('withRetry should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RetriesExhaustedError);
      expect((error as RetriesExhaustedError).cause).toBe(original);
    }
  });

  it('treats retryAfterSeconds: 0 as a valid "retry immediately" delay, not "unset"', async () => {
    // 0 — falsy в JS: реализация обязана проверять typeof === 'number', не
    // просто truthiness error.retryAfterSeconds, иначе 0 ошибочно
    // трактовался бы как "значение не задано" и падал бы в exponential
    // backoff вместо мгновенного повтора.
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new IntegrationRateLimitError('instagram', 'rate limited', 0))
      .mockResolvedValueOnce('ok');
    const start = Date.now();
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10_000, maxDelayMs: 10_000 });
    const elapsedMs = Date.now() - start;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    // Если бы 0 трактовался как "не задано", задержка была бы ~10s
    // (baseDelayMs) — эта проверка отличает два поведения без мока таймеров.
    expect(elapsedMs).toBeLessThan(2000);
  });

  it('respects a custom maxAttempts of 1 (no retries at all)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fails once'));
    await expect(withRetry(fn, { ...FAST_OPTIONS, maxAttempts: 1 })).rejects.toThrow(
      RetriesExhaustedError,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
