import { describe, expect, it } from 'vitest';
import type { IntegrationTokens } from '../../src/integrations/IntegrationProvider';
import {
  createInstagramProvider,
  exchangeForLongLivedToken,
} from '../../src/integrations/providers/instagram';

const hasCredentials = Boolean(
  process.env.INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_TEST_ACCESS_TOKEN,
);

/**
 * Живой smoke-тест против настоящего Instagram API — не мок. Пропускается,
 * если INSTAGRAM_APP_SECRET/INSTAGRAM_TEST_ACCESS_TOKEN не заданы — сознательно
 * не требует Instagram-секретов в CI (см. TASKS.md, Task 3.2).
 *
 * INSTAGRAM_TEST_ACCESS_TOKEN обычно получается через кнопку "Generate
 * Token" в Meta App Dashboard. Является ли такой токен short-lived (~1ч)
 * или уже long-lived (60д) — сама документация Meta не даёт однозначного
 * ответа (INSTAGRAM_API_REVIEW.md §8). Тест поэтому сначала эмпирически
 * проверяет это: пытается обменять токен на long-lived
 * (grant_type=ig_exchange_token).
 *   - Если обмен проходит — токен либо был short-lived и теперь стал
 *     long-lived, либо обмен идемпотентен для уже long-lived токена. В
 *     любом случае у нас теперь заведомо рабочий long-lived токен.
 *   - Если обмен возвращает ошибку — тест логирует это явно (не глотает
 *     молча) и продолжает с исходным токеном напрямую, предполагая, что он
 *     уже был long-lived. Если это предположение неверно, последующий
 *     вызов insights ниже провалится с понятной ошибкой, а не тихо соврёт.
 */
describe.skipIf(!hasCredentials)('instagram provider — live smoke test', () => {
  it(
    'resolves a usable access token and fetches real account insights',
    async () => {
      const originalToken = process.env.INSTAGRAM_TEST_ACCESS_TOKEN as string;
      let tokens: IntegrationTokens;

      try {
        tokens = await exchangeForLongLivedToken(originalToken);
        // eslint-disable-next-line no-console
        console.log(
          `[Task 3.2] Обмен на long-lived успешен, новый токен истекает ${tokens.expiresAt.toISOString()}. ` +
            'Значит исходный INSTAGRAM_TEST_ACCESS_TOKEN был short-lived (либо exchange идемпотентен для уже long-lived).',
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Task 3.2] Обмен на long-lived не удался (${(error as Error).message}). ` +
            'Используем исходный INSTAGRAM_TEST_ACCESS_TOKEN напрямую — похоже, он уже был long-lived. ' +
            'Если следующий вызов insights тоже провалится, токен нужно перегенерировать.',
        );
        tokens = {
          accessToken: originalToken,
          obtainedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        };
      }

      const provider = createInstagramProvider();
      const result = await provider.getAccountInsights({
        accessToken: tokens.accessToken,
        metrics: ['reach'],
        period: 'day',
      });

      // eslint-disable-next-line no-console
      console.log('[Task 3.2] getAccountInsights вернул:', JSON.stringify(result, null, 2));

      expect(Array.isArray(result.metrics)).toBe(true);
      expect(result.metrics.some((metric) => metric.name === 'reach')).toBe(true);
      expect(result.metrics.every((metric) => typeof metric.value === 'number')).toBe(true);
    },
    20000,
  );
});
