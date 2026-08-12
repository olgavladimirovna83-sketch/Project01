# TASKS.md

Задачи идут в порядке выполнения. Каждая самодостаточна, проверяема и содержит ссылку на спецификацию — не нужно заново поднимать архитектуру, чтобы понять задачу.

---

## Phase 0 — Project Foundation

### Task 0.1 — Инициализация репозитория
**Цель:** создать git-репозиторий (local + remote GitHub), базовую структуру папок (`/docs`, `/src`, `/tests`).
**Спецификация:** `42_IMPLEMENTATION_ROADMAP.md`, Phase 0.
**Готово, когда:** репозиторий создан, README есть, первый коммит запушен в remote.

### Task 0.2 — Настройка технического стека
**Цель:** инициализировать Next.js + TypeScript проект, подключить Prisma, создать структуру папок согласно слоям (Data/Analysis/Knowledge/Decision/AI/UI). Сразу заложить обязательные абстракции из `CLAUDE.md` §4.1: `AIProvider`, `ObjectStorageService`, data-access слой для Postgres, заготовку под `ExternalIntegration`-адаптеры — даже пустыми, чтобы domain-код с первого дня не мог напрямую импортировать Anthropic SDK или провайдерские клиенты.
**Спецификация:** `CLAUDE.md` §3–4.1, `24_TECHNICAL_ARCHITECTURE.md`, `29_AI_LAYER.md`.
**Готово, когда:** `npm run dev` поднимает пустое приложение локально без ошибок, а структура папок физически отражает границы слоёв.

### Task 0.3 — Окружения и конфигурация
**Цель:** development и staging окружения, структура `.env`, secrets management вне git.
**Спецификация:** `30_SECURITY_PRIVACY.md` §62–63; `46_PRODUCTION_OPERATIONS_AND_RELIABILITY.md` §3–4.
**Готово, когда:** dev и staging изолированы по credentials и конфигурации.
**Статус:** repo-часть готова — `ENVIRONMENTS.md` (стратегия трёх окружений, правило изоляции), расширенный `.env.example`, `.gitignore` подтверждён. Инфраструктурная часть (реальные Vercel/Neon/Upstash/R2 ресурсы для staging/production) не создана — требует доступа Olga к внешним дашбордам, Claude Code не имеет соответствующих аккаунтов/API-ключей.

### Task 0.4 — Базовый CI
**Цель:** GitHub Actions pipeline (lint, type-check, tests, build) на каждый PR.
**Спецификация:** `46_PRODUCTION_OPERATIONS_AND_RELIABILITY.md` §7; `35_TESTING_QUALITY_CONTROL.md` §53.
**Готово, когда:** PR не мержится при падении критичных проверок.
**Важно:** при `npm install` в CI (как и локально при верификации Task 0.2) `@prisma/client`-postinstall не всегда генерирует клиент автоматически (наблюдалось из-за `allow-scripts`-политики npm). CI pipeline должен явно включать шаг `npx prisma generate` перед `type-check`/`build` — иначе сборка будет падать на отсутствии сгенерированного Prisma Client.
**Статус:** pipeline готов (`.github/workflows/ci.yml`: lint → type-check → build; шаги для тестов добавляются в Task 0.5), все шаги проверены локально. **Не сделано:** required status checks / branch protection для `main` в GitHub Settings — в этой среде нет `gh` CLI, и это repo-настройка вне scope автоматического выполнения агентом. Без этого шага PR технически может быть смёрджен при падении CI — буквальный Definition of Done («PR не мержится при падении критичных проверок») требует ручного действия Olga: Settings → Branches → Branch protection rule для `main` → Require status checks to pass → выбрать check `Lint, type-check, build`.

### Task 0.5 — Инициализация тестового фреймворка
**Цель:** настроить Vitest (unit/integration) и Playwright (E2E), по одному smoke-тесту на каждый.
**Спецификация:** `35_TESTING_QUALITY_CONTROL.md`.
**Готово, когда:** `npm test` и E2E smoke проходят локально и в CI.
**Статус:** Завершена. `vitest.config.ts` + `tests/unit/ai-service.smoke.test.ts`, `playwright.config.ts` + `tests/e2e/home.spec.ts`. `npm test` и `npm run test:e2e` проверены локально — оба проходят (1 passed каждый). CI (`.github/workflows/ci.yml`) расширен шагами `npm test` и `npx playwright install --with-deps chromium` + `npm run test:e2e` — фактический прогон в CI не подтверждён (нет открытого PR/push, требующего срабатывания workflow; будет подтверждено первым же PR/push после этого коммита).

### Task 0.6 — Проверка завершения Phase 0
**Цель:** подтвердить критерий готовности Phase 0.
**Спецификация:** `42_IMPLEMENTATION_ROADMAP.md` §4.
**Готово, когда:** можно запустить проект → прогнать тесты → собрать приложение → задеплоить в staging → безопасно работать с конфигурацией.

---

## Phase 1 — Database Foundation (следующее после Phase 0)

### Task 1.1 — Схема БД: core entities
**Цель:** миграции Prisma для User, Goal, Content, ContentFeature, PerformanceMetric, Pattern, Memory, Recommendation, UserDecision, Experiment.
**Спецификация:** `18_DATA_MODEL.md`, `22_DATA_MODEL.md`, `25_DATABASE_SCHEMA.md`.
**Готово, когда:** миграции применяются и откатываются чисто, связи соответствуют data model.

*(остальные задачи Phase 1+ добавляются по мере продвижения — весь backlog заранее не расписывается, чтобы не рассинхронизироваться с реальностью)*

---

## Phase 3 — предварительное условие (зафиксировано по итогам review, D-0003)

### Task 3.0 — Техническая проверка Instagram/Meta Graph API
**Цель:** проверить актуальные требования Meta/Instagram Graph API перед реализацией OAuth-интеграции: необходимые permissions, business/creator account requirements, token lifecycle (issuance, refresh, expiry, revocation), доступность нужных метрик через API, rate limits, webhook-поддержку.
**Спецификация:** `CLAUDE.md` §4.1 (Instagram/Auth boundary), `08_METRICS_FRAMEWORK.md`, `26_DATA_PIPELINE.md`.
**Готово, когда:** есть письменное резюме — какие permissions запрашивать, какие данные реально доступны, как устроен token lifecycle. Только после этого начинается реализация Integration Service.
**Статус:** YELLOW по независимому review — не блокирует Phase 0/1/2, блокирует только старт самой Instagram-интеграции.

---

## Backlog

### Консолидация пересекающихся документов
**Причина отсрочки:** не блокирует реализацию, противоречий не найдено, только избыточность изложения (см. `DECISIONS.md`, D-0002).
- Объединить `35_TESTING_QUALITY_CONTROL.md` + `43_TESTING_AND_QUALITY_ASSURANCE.md`
- Объединить `31_INFRASTRUCTURE_DEPLOYMENT.md` + `37_DEPLOYMENT_RELEASE_STRATEGY.md`
- Объединить `20_USER_JOURNEY.md` + `33_UX_USER_FLOWS.md`

### First.md
**Причина отсрочки:** требует решения Olga — наполнить или удалить (удаление файла из репозитория — не техническое решение по умолчанию).
