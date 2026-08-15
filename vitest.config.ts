import { defineConfig } from 'vitest/config';
import { sharedResolve, sharedTestConfig } from './vitest.shared';

/**
 * Обычный прогон (`npm test`). Живые тесты против настоящих платных/внешних
 * API (Anthropic — Task 9.1/9.4; Instagram — Task 3.2/4.1) НЕ входят сюда —
 * прямое правило Olga (15 августа 2026): реальные оплачиваемые/внешние
 * вызовы не должны запускаться "заодно, по привычке" при каждом обычном
 * прогоне, только по явному запросу. Обычный прогон продолжает проверять
 * ту же AI-логику через уже существующие integration-тесты с подменённым
 * `generate` (`decision-explanation.smoke.test.ts`/
 * `content-suggestion.smoke.test.ts`) — они бесплатны и уже покрывают
 * поведение. Живые тесты запускаются отдельно — см. `vitest.live.config.ts`
 * и `npm run test:live`/`test:live-ai`/`test:live-instagram`.
 */
export default defineConfig({
  resolve: sharedResolve,
  test: {
    ...sharedTestConfig,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/integration/**/*-live.smoke.test.ts'],
  },
});
