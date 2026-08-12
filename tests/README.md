# /tests

Тесты приложения: unit/integration (Vitest) и E2E (Playwright), согласно `CLAUDE.md` §7 и `35_TESTING_QUALITY_CONTROL.md`.

- `unit/` — Vitest, `*.test.ts`, конфигурация в `vitest.config.ts` (корень репозитория)
- `e2e/` — Playwright, `*.spec.ts`, конфигурация в `playwright.config.ts` (корень репозитория); поднимает dev-сервер автоматически (`webServer`)

## Запуск

```bash
npm test          # unit/integration (Vitest), однократный прогон
npm run test:watch  # Vitest в watch-режиме
npm run test:e2e  # E2E (Playwright); при первом запуске: npx playwright install chromium
```

CI (`.github/workflows/ci.yml`) прогоняет оба набора на каждый PR/push в `main`.

Наполняется реальными тестами по мере реализации функциональности — на Task 0.5 здесь по одному smoke-тесту на фреймворк, подтверждающему, что раннер и базовая конфигурация работают.
