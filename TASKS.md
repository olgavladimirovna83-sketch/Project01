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
**Статус:** Завершена по всем локально проверяемым критериям — запуск проекта (Task 0.2), тесты (Task 0.5), сборка (Task 0.2/0.4), безопасная работа с конфигурацией (Task 0.3, `ENVIRONMENTS.md`). Критерий «deploy в staging» сознательно отложен — продуктовое решение Olga, см. `DECISIONS.md` D-0007. Перенесён в Backlog ниже. **Phase 0 считается завершённым.**

---

## Phase 1 — Database Foundation (следующее после Phase 0)

### Phase 1 completion — отложенный критерий «connected account»
`42_IMPLEMENTATION_ROADMAP.md` §8 (PHASE 1 COMPLETION) включает критерий «создать connected account». В 10-сущностной схеме Task 1.1 (`DECISIONS.md`, D-0008) сущности `ExternalAccount` нет — ожидаемо, не пропущено. `ExternalAccount` тесно связана с `ExternalIntegration` (`src/integrations/`), которая намеренно оставлена пустым интерфейсом до Task 3.0 (техническая проверка Meta/Instagram Graph API — permissions, token lifecycle). Проектировать таблицу connected account раньше, чем понятен реальный OAuth/token lifecycle — та же логика, что в D-0003 (Instagram/Auth boundary, YELLOW, не блокирует Phase 0/1/2). **Критерий «создать connected account» отложен до Phase 3 / Task 3.0. Не блокирует закрытие Phase 1 по остальным критериям.**

### Task 1.1 — Схема БД: core entities
**Цель:** миграции Prisma для User, Goal, Content, ContentFeature, PerformanceMetric, Pattern, Memory, Recommendation, UserDecision, Experiment.
**Спецификация:** `18_DATA_MODEL.md`, `22_DATA_MODEL.md`, `25_DATABASE_SCHEMA.md`.
**Готово, когда:** миграции применяются и откатываются чисто, связи соответствуют data model.
**Статус:** Завершена. `prisma/schema.prisma` — 10 моделей + 5 enum (см. `DECISIONS.md`, D-0008 по поводу scope и enum/String правила). Миграция `20260812142954_init_core_entities` применена и провалидирована на локальном PostgreSQL (Postgres.app): `prisma migrate dev` — применена на dev-базе `olga`; чистый rollback/reapply подтверждён через `prisma migrate reset` на отдельной одноразовой базе `project_bootstrap_migration_check` (создана и удалена только для этой проверки, база `olga` не тронута). `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` — без ошибок после изменений.

### Task 1.2 — Data-access слой (repository)
**Цель:** repository-слой в `src/data/` поверх Prisma-моделей из Task 1.1, для всех 10 сущностей — базовые `create`/`findById`/`update`-функции, не более того, что реально понадобится ближайшим фазам (без delete/soft-delete, без поиска по связям — добавляются по мере необходимости).
**Спецификация:** `42_IMPLEMENTATION_ROADMAP.md` §5 (repository/data-access layer как часть Phase 1), `CLAUDE.md` §4.1 (единственная точка доступа к `@prisma/client`).
**Готово, когда:** по репозиторию на каждую из 10 сущностей с `create`/`findById`/`update`; smoke-тест, реально проходящий по оставшимся критериям Phase 1 completion (`42_IMPLEMENTATION_ROADMAP.md` §8): создать user → сохранить данные → получить данные обратно.
**Статус:** Завершена. `src/data/repositories/` — 10 файлов (`userRepository`, `goalRepository`, `contentRepository`, `contentFeatureRepository`, `performanceMetricRepository`, `patternRepository`, `memoryRepository`, `recommendationRepository`, `userDecisionRepository`, `experimentRepository`), реэкспорт через `src/data/index.ts`. Интеграционный smoke-тест `tests/integration/user-data-flow.smoke.test.ts` (новая папка `tests/integration/`, добавлена в `vitest.config.ts`): создаёт user → создаёт связанный goal → читает оба обратно → проверяет данные → убирает за собой (`afterAll` + `onDelete: Cascade`). CI (`.github/workflows/ci.yml`) получил `postgres:16` service-контейнер + шаг `prisma migrate deploy` перед тестами — интеграционный тест теперь реально прогоняется и в CI, не только локально. Проверено локально: `npm test` (2/2 passed), `npm run test:e2e` (1/1 passed), `npx tsc --noEmit`, `npm run lint`, `npm run build` — без ошибок; после прогона в БД `olga` не осталось тестовых строк (проверено `psql`).

**Phase 1 — Database Foundation считается завершённой** по всем критериям `42_IMPLEMENTATION_ROADMAP.md` §8, кроме «connected account» (сознательно отложен до Phase 3/Task 3.0 — см. выше).

*(остальные задачи Phase 1+ добавляются по мере продвижения — весь backlog заранее не расписывается, чтобы не рассинхронизироваться с реальностью)*

---

## Phase 2 — Authentication (следующее после Phase 1)

### Task 2.1 — Auth.js: техническая основа (schema + конфигурация)
**Цель:** подключить Auth.js для **App Authentication** (не Instagram Integration — это принципиально разные слои, CLAUDE.md §3.2/§4.1). Расширить `prisma/schema.prisma` под Auth.js (`Account`, `Session`, `VerificationToken` + auth-поля на существующей модели `User` — email, password hash и т.п., в зависимости от выбранного механизма). Настроить базовый Auth.js route handler и session strategy с Prisma adapter. **Не входит в эту задачу:** UI/API для registration/login/logout, account recovery, authorization/roles — отдельные последующие задачи, не расписываются заранее.
**Спецификация:** `42_IMPLEMENTATION_ROADMAP.md` §9–11 (Phase 2: registration/login/logout/session management/password requirements/account recovery; Phase 2 completion criterion — «создать account → войти → получить доступ только к своим данным»); `CLAUDE.md` §3.2/§4/§4.1 (App Authentication ≠ Instagram Integration, Auth.js — выбранный инструмент); `30_SECURITY_PRIVACY.md` §6–9 (authentication mechanisms, passwords, session security, authorization).
**Готово, когда:** миграция под auth-таблицы применяется и откатывается чисто (как в Task 1.1); Auth.js может создать и прочитать сессию для тестового пользователя (integration smoke-тест по аналогии с Task 1.2); конкретный auth-механизм для MVP выбран и явно задокументирован как решение в `DECISIONS.md` — `30_SECURITY_PRIVACY.md` §6 прямо оставляет этот выбор («OAuth; token-based authentication; passwordless authentication... Конкретный механизм определяется на этапе реализации»).
**Статус:** Завершено. `prisma/schema.prisma` расширен под Auth.js (`Account`/`Session`/`VerificationToken` + `email`/`emailVerified`/`name`/`image`/`passwordHash` на `User`), миграция `20260812163141_auth_js_foundation` применена на dev-базе `olga` и проверена на чистое применение полной истории миграций на одноразовой базе (аналогично Task 1.1). Механизм — **Credentials (email+password)**, выбран специально чтобы не создавать RED-зависимость от внешнего email-сервиса (см. `DECISIONS.md`, D-0009, по прямому ограничению Olga). `src/auth/` — `config.ts` (`NextAuth()` + `PrismaAdapter`, JWT session strategy), `credentials.ts` (`authenticateWithCredentials`, вынесена из provider'а для прямой тестируемости), `password.ts` (`bcryptjs`), `types.d.ts` (module augmentation `session.user.id`), route handler `src/app/api/auth/[...nextauth]/route.ts`. Integration smoke-тест (`tests/integration/auth-credentials.smoke.test.ts`) проверяет `authenticateWithCredentials` против живой БД: верный пароль → пользователь, неверный пароль → null, неизвестный email → null; корректно чистит за собой. **Не проверялось** (за пределами scope Task 2.1): полный HTTP sign-in flow — issuance/чтение cookie-based JWT-сессии через реальный `/api/auth/*` endpoint в браузере; это относится к следующим задачам Phase 2 (login UI/API). `npx tsc --noEmit`, `npm run lint`, `npm run build` (включая регистрацию `/api/auth/[...nextauth]` как dynamic route), `npm test` (3/3), `npm run test:e2e` (1/1) — все прошли локально; CI (`.github/workflows/ci.yml`) дополнен `AUTH_SECRET` (CI-only, не реальный секрет — нужен, т.к. `NextAuth()` конструируется на этапе загрузки модуля).

*(остальные задачи Phase 2 — сама реализация registration/login/logout, account recovery, authorization/roles — добавляются по мере продвижения, не расписываются заранее)*

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
- `42_IMPLEMENTATION_ROADMAP.md` §6 использует обобщённую терминологию (RawData/NormalizedData/Insight/KnowledgeItem), не совпадающую дословно с 18/22_DATA_MODEL.md — вероятно, разный уровень абстракции одного и того же, не отдельная схема; свериться при необходимости, не блокирует.

### First.md
**Причина отсрочки:** требует решения Olga — наполнить или удалить (удаление файла из репозитория — не техническое решение по умолчанию).

### Реальная staging-инфраструктура (Vercel/Neon/Upstash/R2)
**Причина отсрочки:** продуктовое решение Olga, не техническое (см. `DECISIONS.md`, D-0007). Локальная разработка Phase 1 не требует внешних облачных аккаунтов. Вернуться к этому пункту перед первым реальным демо, внешним доступом или интеграцией, требующей публичного URL/webhook (например, Instagram OAuth, Phase 3).
- Создать проект Vercel, ветки/базы Neon, инстанс Upstash, bucket R2 для staging и production по стратегии в `ENVIRONMENTS.md`
- Настроить branch protection для `main` в GitHub Settings (открытый пункт с Task 0.4)
