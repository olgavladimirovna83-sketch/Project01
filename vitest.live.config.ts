import { defineConfig } from 'vitest/config';
import { sharedResolve, sharedTestConfig } from './vitest.shared';

/**
 * Живые тесты против настоящих платных/внешних API — НЕ часть обычного
 * прогона (`npm test`, `vitest.config.ts`). Запускать только по явному
 * запросу Olga, либо когда только что менялся AI/Instagram-код и стоит
 * реально проверить его против настоящего API — не "заодно, по привычке"
 * при каждой задаче (прямое правило Olga, 15 августа 2026).
 *
 * Все 4 файла уже пропускают себя, если нет нужных credentials
 * (`describe.skipIf`) — этот конфиг только решает, запускаются ли они
 * ВООБЩЕ, не их собственную логику skip.
 *
 * `npm run test:live` — все 4 (Anthropic + Instagram).
 * `npm run test:live-ai` — только Anthropic (Task 9.1/9.4), реальные деньги.
 * `npm run test:live-instagram` — только Instagram (Task 3.2/4.1), бесплатно,
 * но реальный внешний сервис — та же логика "не по умолчанию".
 */
export default defineConfig({
  resolve: sharedResolve,
  test: {
    ...sharedTestConfig,
    include: ['tests/integration/**/*-live.smoke.test.ts'],
  },
});
