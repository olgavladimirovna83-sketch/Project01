# CHANGELOG.md

Формат: [Keep a Changelog](https://keepachangelog.com/). Каждая значимая задача добавляет запись сюда.

---

## [Unreleased]

### Added
- Репозиторий проекта с полной архитектурной документацией (`/docs`)
- Операционные файлы: `CLAUDE.md`, `CURRENT_STATUS.md`, `TASKS.md`, `DECISIONS.md`, `CHANGELOG.md`
- D-0001: выбор технологического стека MVP (Next.js + TypeScript, PostgreSQL, Prisma, BullMQ/Redis, Auth.js, Anthropic Claude API, R2, Sentry)
- Task 0.1: базовая структура репозитория — `/src` и `/tests` (с пояснительными README, заполняются в Task 0.2/0.5); подтверждена связь local ↔ GitHub remote (`origin/main`)
- Task 0.2: Next.js 15 (App Router) + TypeScript + Prisma scaffolding — `package.json`, `tsconfig.json`, `next.config.mjs`, `.eslintrc.json`, `prisma/schema.prisma` (datasource-only, сущности — Task 1.1)
- Task 0.2: структура `/src` по слоям — `data/`, `analysis/`, `knowledge/`, `decision/`, `ai/`, `storage/`, `integrations/`, `learning/`, `app/` (UI + API layer)
- Task 0.2: обязательные абстракции из CLAUDE.md §4.1 — `AIProvider`/`AIService` (`src/ai/`, единственный импорт `@anthropic-ai/sdk` изолирован в `providers/anthropic.ts`), `ObjectStorageService` (`src/storage/`, единственный импорт AWS S3 SDK изолирован в `providers/r2.ts`), Prisma Client singleton (`src/data/prismaClient.ts`), `ExternalIntegration` — пустой интерфейс до Task 3.0
- `.env.example` с плейсхолдерами (`DATABASE_URL`, `ANTHROPIC_API_KEY`, R2-переменные) — полная схема окружений в Task 0.3
- `package-lock.json` — зафиксирован после `npm install` (373 пакета)
- Task 0.3: `ENVIRONMENTS.md` — стратегия трёх окружений (dev/staging/production), правило изоляции credentials/БД/Redis/storage, правила secrets management (никогда в git/логах/frontend bundle)
- Task 0.3: `.env.example` расширен до полного набора переменных стека — `REDIS_URL` (BullMQ/Upstash), `AUTH_SECRET` (Auth.js), `SENTRY_DSN`, с комментариями по назначению и окружению
- Task 0.4: `.github/workflows/ci.yml` — GitHub Actions pipeline (`pull_request`/`push` на `main`): `npm ci` → `npx prisma generate` → `npm run lint` → `npx tsc --noEmit` → `npm run build`
- Task 0.5: Vitest (`vitest.config.ts`, `tests/unit/ai-service.smoke.test.ts`) и Playwright (`playwright.config.ts`, `tests/e2e/home.spec.ts`) — по одному smoke-тесту на фреймворк; `package.json` scripts `test`/`test:watch`/`test:e2e`
- Task 0.5: `.gitignore` — исключены артефакты Playwright (`/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`)
- Task 0.6: Phase 0 закрыта — все локально проверяемые критерии `42_IMPLEMENTATION_ROADMAP.md` §4 подтверждены
- Task 1.1: `prisma/schema.prisma` — 10 core-моделей (User, Goal, Content, ContentFeature, PerformanceMetric, Pattern, Memory, Recommendation, UserDecision, Experiment) и 5 enum (`PatternDirection`, `PatternStatus`, `MemoryType`, `RecommendationStatus`, `UserDecisionType`); первая миграция `20260812142954_init_core_entities`
- `.env` (реальный, не в git) — `DATABASE_URL` для локального Postgres.app через Unix socket
- Task 1.2: `src/data/repositories/` — по одному репозиторию (`create`/`findById`/`update`) на каждую из 10 сущностей
- Task 1.2: `tests/integration/` (новая папка) — `user-data-flow.smoke.test.ts`, Phase 1 completion smoke test (`42_IMPLEMENTATION_ROADMAP.md` §8): создать user → сохранить данные → получить обратно
- Task 1.2: `.github/workflows/ci.yml` — `postgres:16` service-контейнер + шаг `prisma migrate deploy`, чтобы интеграционные тесты реально гонялись в CI
- Task 2.1: `prisma/schema.prisma` расширен под Auth.js — модели `Account`/`Session`/`VerificationToken` + поля `email`/`emailVerified`/`name`/`image`/`passwordHash` на `User`; миграция `20260812163141_auth_js_foundation`
- Task 2.1: `src/auth/` — `config.ts` (`NextAuth()` + `PrismaAdapter`, JWT session strategy), `credentials.ts` (`authenticateWithCredentials`), `password.ts` (`bcryptjs`-хеширование), `types.d.ts` (module augmentation), `README.md`
- Task 2.1: `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- Task 2.1: `src/data/repositories/userRepository.ts` — добавлен `findByEmail`
- Task 2.1: `tests/integration/auth-credentials.smoke.test.ts` — smoke-тест `authenticateWithCredentials` против живой БД
- Task 2.1: `.github/workflows/ci.yml` дополнен `AUTH_SECRET` (CI-only значение, не реальный секрет)
- D-0009: механизм аутентификации MVP — Credentials (email+password), выбран чтобы не создавать RED-зависимость от внешнего email-сервиса (по ограничению Olga)
- Task 2.2: `src/auth/register.ts` — `registerUser` (валидация email/пароля, проверка занятого email, хеширование, создание пользователя)
- Task 2.2: `src/app/api/register/route.ts`, `src/app/api/me/route.ts` — registration API и единственный protected route
- Task 2.2: `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/_components/LogoutButton.tsx` — UI для входа/регистрации/выхода
- Task 2.2: `tests/e2e/auth-flow.spec.ts` — полный HTTP session cycle через реальный браузер (issuance/чтение cookie-based JWT-сессии, logout-инвалидация, user isolation на двух независимых аккаунтах) — закрывает пробел, оставленный в Task 2.1
- Task 2.2: `tests/integration/auth-registration.smoke.test.ts` — `registerUser` против живой БД
- Task 2.3: `src/auth/session.ts` — `requireSessionUserId()`, общая точка получения user id из сессии
- Task 2.3: `src/app/api/goals/route.ts` (`POST`), `src/app/api/goals/[id]/route.ts` (`GET`) — первый ownership-protected resource за пределами `User`
- Task 2.3: `tests/e2e/helpers/auth.ts` — общий `registerAndLogin`/`uniqueEmail` helper для e2e-тестов
- Task 2.3: `tests/e2e/goal-authorization.spec.ts` — ownership-check на `Goal` через реальный браузер (401 без сессии, owner читает свой goal, чужой пользователь получает 404 неотличимо от несуществующего id)
- Task 3.0: `INSTAGRAM_API_REVIEW.md` — письменное резюме технической проверки Instagram/Meta Graph API (permissions, token lifecycle, доступные метрики, rate limits, webhooks) перед реализацией Integration Service; research-only, без создания Meta developer-аккаунта
- Task 3.1: `src/integrations/IntegrationProvider.ts` — контракт `ExternalIntegration`-адаптеров (authorize URL, code exchange, refresh, account/media insights, best-effort disconnect), `IntegrationAuthError`/`IntegrationRateLimitError` как разные типы ошибок
- Task 3.1: `src/integrations/IntegrationService.ts` — domain-facing фасад на registry (`registerIntegrationProvider`)
- Task 3.1: `src/integrations/index.ts` — публичные экспорты модуля

### Fixed
- `INSTAGRAM_API_REVIEW.md` §3: исправлен вывод о permissions после того, как Olga лично прошла реальную авторизацию Instagram — insights оказался отдельным разрешением от `instagram_business_basic`, не его частью, как предполагала исходная версия резюме. Подтверждённый набор: `instagram_business_basic` + insights, comments/messages/content-publish осознанно отключены

### Changed
- Task 2.2: `src/app/page.tsx` — стал async server component, показывает logged-in/logged-out состояние через `auth()`
- Task 2.2: `src/auth/config.ts` — добавлен `pages: { signIn: '/login' }`
- Task 2.3: `src/app/api/me/route.ts` отрефакторен на `requireSessionUserId()` (без изменения поведения)
- Task 2.3: `tests/e2e/auth-flow.spec.ts` — использует общий helper из `tests/e2e/helpers/auth.ts` вместо локальных дублей
- **Phase 2 — Authentication закрыта** (решение Olga, 12 августа 2026) на объёме Task 2.1–2.3 — критерий `42_IMPLEMENTATION_ROADMAP.md` §11 подтверждён тестами; account recovery/password reset и role model сознательно вне MVP-scope, см. `TASKS.md`
- D-0001 пересмотрено: исходное решение принято без систематической проверки, переделано по 10-пунктному чек-листу с построчным чтением всех 46 документов
- CLAUDE.md: добавлена иерархия документации (ранняя волна 04–16 vs поздняя 17–46), обновлён стек (object storage, observability)

### Findings (D-0002 — полный документальный аудит)
- `06_RECOMMENDATION_ENGINE.md` помечен как superseded от `13_RECOMMENDATION_ENGINE.md`
- Уточнена область применения комментариев/репостов: собираются как данные, не входят в 4 основные recommendation-категории
- Обнаружены 3 пары документов с существенным пересечением без противоречий — добавлены в backlog на консолидацию
- PDF-приложения идентифицированы как материалы бренд-войса, не архитектурная документация
- `First.md` — пустой файл, удалён по решению Olga

### Review (D-0003 — независимый архитектурный review от ChatGPT)
- Стек и документация подтверждены без пересмотра: architecture/stack/DB/async/deployment/AI abstraction/documentation — все GREEN
- Instagram/Auth boundary помечен YELLOW — добавлена обязательная задача технической проверки перед Phase 3 (Task 3.0)
- В CLAUDE.md добавлен §4.1: обязательные архитектурные границы (App Auth vs Instagram Integration, AI_SERVICE→AI_PROVIDER_ADAPTER, инфраструктурные абстракции, layer discipline, async processing требования, гранулярность DECISIONS.md)

### Changed (D-0006 — смена GitHub-аккаунта/репозитория)
- Репозиторий перенесён с `Olgavladimirovna83-create/Application` на `olgavladimirovna83-sketch/Project01` — RED-действие, выполненное лично Olga (создание аккаунта, fine-grained PAT, репозитория), не автоматизацией
- Старый репозиторий сохранён как резервный, не удалён; старый credential в Keychain не тронут
- `README.md`/`ENVIRONMENTS.md` проверены на захардкоженные ссылки на старый репозиторий — не найдено

### Deferred (D-0007 — облачная инфраструктура)
- Реальные staging/production ресурсы (Vercel, Neon, Upstash, R2) сознательно отложены — продуктовое решение Olga, не техническое ограничение
- Task 0.6 закрыт по всем локально проверяемым критериям; критерий «deploy в staging» перенесён в Backlog `TASKS.md`
- **Phase 0 — Project Foundation считается завершённым**

### Changed (D-0008 — scope Task 1.1: 10 сущностей, не более широкие MVP-списки)
- Task 1.1 реализует ровно 10-сущностный список из `TASKS.md`/`18_DATA_MODEL.md` §45, а не более широкие списки `22_DATA_MODEL.md` §54 (14 сущностей, entity-уровень) и `25_DATABASE_SCHEMA.md` §62 (18 таблиц, table-уровень) — обоснование в `DECISIONS.md`
- `ExternalAccount`/`Hypothesis` представлены как nullable-строковые поля без `@relation` (`Content.externalAccountId`/`externalContentId`, `Experiment.hypothesisId`) — переживут появление реальных таблиц как аддитивная миграция
- Правило enum vs String зафиксировано: открытые категории (`goalType`, `contentType`, `patternType`, `featureType`, `metricType`) — `String`; закрытые наборы состояний (`PatternStatus`, `PatternDirection`, `MemoryType`, `RecommendationStatus`, `UserDecisionType`) — Prisma `enum`
- Явная зарубка: перед Phase 7/8 свериться с `22_DATA_MODEL.md` §54 и добавить Baseline/Hypothesis/RecommendationReason/Action/Outcome (5 сущностей, не 4)
- D-0002 addendum: расхождение MVP entity-списков между `18_DATA_MODEL.md` §45 и `22_DATA_MODEL.md` §54 не было поймано исходным аудитом — зафиксировано постфактум, не RED

### Verified (Task 0.2)
- Node.js v24.19.0 / npm 11.17.0 установлены Olga вручную (официальный установщик)
- `npm install` — 373 пакета без ошибок; `npx prisma generate` — клиент сгенерирован
- `npx tsc --noEmit` — без ошибок типов
- `npm run dev` — сервер поднялся (`Ready in 2.6s`), `GET /` вернул HTTP 200 с ожидаемым содержимым

### Verified (Task 0.4)
- `npm run lint` — 0 warnings/errors (с deprecation-предупреждением `next lint` → удаляется в Next.js 16, см. Known issues)
- `npm run build` (с плейсхолдерным `DATABASE_URL`) — успешная production-сборка, все 4 маршрута статически пререндерены

### Verified (Task 0.5)
- `npm test` (Vitest) — 1 passed
- `npx playwright install chromium` — браузер установлен
- `npm run test:e2e` (Playwright, Chromium) — 1 passed
- `npx tsc --noEmit` и `npm run lint` повторно проверены после добавления тестовых файлов/конфигов — без ошибок
- CI на GitHub Actions подтверждён зелёным Olga (push после Task 0.5)

### Verified (Task 1.1)
- PostgreSQL: Postgres.app установлен и инициализирован Olga локально; подключение проверено через `psql` и через Prisma (`prisma db execute`) по Unix socket (`/tmp`) — TCP/`localhost` упирается в permission-dialog Postgres.app, требующий разового GUI-подтверждения
- `npx prisma validate` — схема валидна
- `npx prisma migrate dev --name init_core_entities` — применена на dev-базе `olga`, создано 10 таблиц + FK/индексы
- Rollback/reapply: `npx prisma migrate reset --force` (gated самим Prisma как AI-agent dangerous action — потребовал явного согласия Olga) выполнен на отдельной одноразовой базе `project_bootstrap_migration_check`, не на `olga`; после проверки база удалена, `olga` не тронута
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` — без ошибок после изменения схемы

### Verified (Task 1.2)
- `npm test` — 2/2 passed (unit + новый integration smoke test)
- `npm run test:e2e` — 1/1 passed
- `npx prisma migrate deploy` — идемпотентен (No pending migrations to apply) как локально, так и в CI против свежего `postgres:16`
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — без ошибок
- После прогона интеграционного теста в БД `olga` не осталось тестовых строк (`psql` — `count(*) = 0` для `users`/`goals`)

### Known issues
- `npm audit`: 3 high severity — транзитивные `postcss`/`sharp` через Next.js 15; фикс требует мажорного апгрейда до Next.js 16, не выполнен автоматически (решение об апгрейде — отдельно, не блокирует Phase 0; см. `DECISIONS.md`, D-0005)
- `next lint` помечен deprecated, будет удалён в Next.js 16 — при будущем апгрейде (см. пункт выше) потребуется миграция на ESLint CLI напрямую (`npx @next/codemod@canary next-lint-to-eslint-cli .`)
- Реальные staging/production ресурсы (Vercel, Neon, Upstash, R2) сознательно не созданы — продуктовое решение Olga, см. `DECISIONS.md` D-0007, Backlog в `TASKS.md`
- Task 0.4: required status checks / branch protection для `main` не настроены — нет `gh` CLI и это repo-настройка, которую агент не включает самостоятельно (см. CURRENT_STATUS.md)
- `vitest.config.ts` при запуске выводит предупреждение о будущей смене дефолтного `configLoader` в Vite (ESM-конфиг, загружаемый как CommonJS) — не ошибка, не блокирует тесты, безопасно отложить
- Более широкий набор сущностей/таблиц из `22_DATA_MODEL.md` §54 и `25_DATABASE_SCHEMA.md` §62 (`ExternalAccount`, `Baseline`, `Hypothesis`, `RecommendationReason`, `Action`, `Outcome`, `Event` и т.д.) не реализован в Task 1.1/1.2 — сознательный scope-выбор, см. `DECISIONS.md` D-0008; обязательная сверка перед Phase 7/8
- Критерий Phase 1 completion «создать connected account» (`42_IMPLEMENTATION_ROADMAP.md` §8) сознательно отложен до Phase 3/Task 3.0 — та же логика, что D-0003 (Instagram/Auth boundary); не блокирует закрытие Phase 1
