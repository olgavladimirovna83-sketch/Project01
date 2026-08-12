# /tests

Тесты приложения: unit/integration (Vitest) и E2E (Playwright), согласно `CLAUDE.md` §7 и `35_TESTING_QUALITY_CONTROL.md`.

- `unit/` — Vitest, без внешних зависимостей (никакой реальной БД/сети)
- `integration/` — Vitest, требует живого PostgreSQL (`DATABASE_URL` с применёнными миграциями) — например `tests/integration/user-data-flow.smoke.test.ts` (Phase 1 completion smoke test: создать user → сохранить данные → получить обратно)
- `e2e/` — Playwright, `*.spec.ts`, конфигурация в `playwright.config.ts` (корень репозитория); поднимает dev-сервер автоматически (`webServer`)

Конфигурация Vitest — `vitest.config.ts` (корень репозитория), покрывает и `unit/`, и `integration/`.

## Запуск

```bash
npm test          # unit + integration (Vitest), однократный прогон — нужен DATABASE_URL для integration/
npm run test:watch  # Vitest в watch-режиме
npm run test:e2e  # E2E (Playwright); при первом запуске: npx playwright install chromium
```

CI (`.github/workflows/ci.yml`) поднимает `postgres:16` как service-контейнер, применяет миграции (`prisma migrate deploy`) и прогоняет все три набора на каждый PR/push в `main`.

Интеграционные тесты сами убирают за собой созданные данные (например через `afterAll` + `onDelete: Cascade`) — не должны оставлять мусор в БД, на которой запускались.
