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
- Task 3.2: `src/integrations/providers/instagram.ts` — конкретная реализация `IntegrationProvider` для Instagram Business Login против реальных `api.instagram.com`/`graph.instagram.com`, включая `exchangeForLongLivedToken` как отдельно вызываемую диагностическую функцию
- Task 3.2: `tests/unit/instagram-authorize-url.test.ts` — unit-тест `getAuthorizationUrl` (без сети)
- Task 3.2: `tests/integration/instagram-live.smoke.test.ts` — живой smoke-тест против реального Instagram API (пропускается без credentials, не требует Instagram-секретов в CI)
- Task 3.2: `.env.example` дополнен `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`/`INSTAGRAM_API_VERSION`/`INSTAGRAM_TEST_ACCESS_TOKEN`
- Task 3.2: `src/integrations/bootstrap.ts` — регистрирует `createInstagramProvider()` в `IntegrationService` (side-effect import, registry-паттерн Task 3.1)
- Task 3.2: `src/app/api/integrations/instagram/callback/route.ts` — диагностический OAuth callback: читает `code`/`state`/`error` из редиректа, вызывает `exchangeCodeForTokens`, показывает сырой результат; не production connect-flow (нет persistence)
- Task 3.3: `prisma/schema.prisma` — модель `ExternalAccount` (`25_DATABASE_SCHEMA.md` §7) + enum `ExternalAccountStatus`, миграция `20260813082115_external_accounts`
- Task 3.3: `src/data/repositories/externalAccountRepository.ts` — `create`/`findByUserId`/`update`
- Task 3.3: `tests/integration/external-account-data-flow.smoke.test.ts` — repository против живой БД
- Task 3.3: `IntegrationProvider.getAccountIdentity`/`IntegrationService.getAccountIdentity` — id аккаунта платформы, нужен для `ExternalAccount.externalUserId`
- D-0010: известный security-gap — `ExternalAccount.accessToken` без encryption at rest, зафиксирован явно с зарубкой «закрыть до production»
- Task 3.4: `src/integrations/config.ts` — общие `INSTAGRAM_REDIRECT_URI`/`INSTAGRAM_OAUTH_STATE_COOKIE`
- Task 3.4: `src/app/api/integrations/instagram/authorize/route.ts` — реальная инициация подключения (заменяет throwaway-скрипт Task 3.2), генерирует и сохраняет CSRF `state` в cookie
- Task 3.4: `src/app/api/integrations/instagram/disconnect/route.ts` — переводит `ExternalAccount` в `disconnected` (не удаляет), best-effort `IntegrationService.disconnect`
- Task 3.4: `src/app/integrations/page.tsx`, `DisconnectButton.tsx` — экран статуса подключения (подключить/статус/отключить)
- Task 3.4: `tests/e2e/integrations-instagram.spec.ts` — 4 теста через реальный браузер и БД (неаутентифицированный доступ, «не подключён», подключение/отключение с seed-данными вместо реального Instagram round trip)
- Task 3.4: `.env.example` дополнен `INSTAGRAM_REDIRECT_URI`
- Task 3.4 (дополнение): `ExternalAccount.username` (nullable) — по запросу Olga, нужен различать несколько связанных Instagram-аккаунтов; миграция `20260813153419_external_account_username`
- Task 4.1: `src/ingestion/normalize.ts` — чистые `validateMediaItem`/`normalizeContentType` (validation/normalization шаги ingestion pipeline, без сети/БД)
- Task 4.1: `src/ingestion/instagramSync.ts` — `syncInstagramAccount(userId)`, оркестрация fetch→validate→normalize→store поверх `IntegrationService`
- Task 4.1: `src/app/api/integrations/instagram/sync/route.ts` — `POST`, синхронный триггер разовой синхронизации
- Task 4.1: `src/app/integrations/SyncButton.tsx` — кнопка «Синхронизировать» + отображение результата
- Task 4.1: `src/data/repositories/contentRepository.ts` — `findByExternalId` (dedup-lookup по natural key)
- Task 4.1: `tests/unit/ingestion-normalize.test.ts` — 10 тестов на синтетических данных
- Task 4.1: `tests/integration/instagram-sync-live.smoke.test.ts` — живой smoke-тест полного pipeline против реального Instagram API (skip-if-no-credentials, как Task 3.2)
- D-0011: сырой ответ Instagram API не сохраняется отдельно на этом этапе — только нормализованные данные, YELLOW-решение зафиксировано заранее по запросу Olga
- D-0012: forward-looking — связь «формат контента ↔ цель» не должна быть жёстко закодирована ни в коде, ни в промптах AI, вычисляется статистически через `GOAL_PERFORMANCE`/`PATTERN` для каждого пользователя (продуктовое требование Olga, важно перед Phase 6–9)
- D-0013: `Content.contentType` держит `'reel'` отдельно от `'video'` — осознанное отклонение от иллюстративного примера `26_DATA_PIPELINE.md` §9, обосновано требованиями будущего Pattern Detection (Phase 7)
- Task 4.2: `prisma/schema.prisma` — новая модель `AccountSnapshot` (по аналогии с `PerformanceMetric`, но на уровне `ExternalAccount`), миграция `20260813191441_account_snapshots`
- Task 4.2: `src/data/repositories/accountSnapshotRepository.ts` — `create`/`findByExternalAccountId`
- Task 4.2: `DOCUMENT_CROSS_REFERENCE.md` — новый файл, реестр найденных расхождений/пробелов между `/docs` и реализацией (раздел «Известные ограничения»: account-level метрики не покрыты `25_DATABASE_SCHEMA.md`)
- D-0014: новая сущность `AccountSnapshot` для account-level метрик — ни `PerformanceMetric`, ни `Baseline` для этого не подходят, YELLOW-решение с обоснованием
- Task 4.3: `src/ingestion/retry.ts` — `withRetry`/`RetriesExhaustedError`, exponential backoff + maximum attempts, `IntegrationAuthError` не ретраится, `IntegrationRateLimitError.retryAfterSeconds` используется как задержка
- Task 4.3: `tests/unit/ingestion-retry.test.ts` — 7 тестов на синтетических ошибках, без сети/таймеров реального времени
- Task 5.1: `src/dataQuality/dataQualityStatus.ts` — `getDataQualityStatus(userId)`, сводит `ExternalAccount`/`AccountSnapshot`/`PerformanceMetric` в freshness/gaps/failure статус (42_IMPLEMENTATION_ROADMAP.md §28–29), без сбора новых данных
- Task 5.1: `src/app/api/data-quality/route.ts` — `GET`, session-protected
- Task 5.1: `tests/integration/data-quality-status.smoke.test.ts` — 6 тестов против реальной БД, без сетевых вызовов
- D-0015: `SyncWarning` (Task 4.3) не персистится — `hasRecentFailure` в data quality status основан только на `ExternalAccount.status`, YELLOW-решение с обоснованием
- Task 5.2: `src/dataQuality/completeness.ts` — чистая `computeCompleteness` (26_DATA_PIPELINE.md §56–57), доля публикаций с полным набором метрик
- Task 5.2: `src/dataQuality/anomalyDetection.ts` — чистая `detectSyncCountAnomaly`, кластеризация по разрыву времени + относительный порог (не абсолютный)
- Task 5.2: `tests/unit/data-quality-completeness.test.ts` — 6 тестов на синтетических данных
- Task 5.2: `tests/unit/data-quality-anomaly-detection.test.ts` — 7 тестов на синтетических данных
- D-0016: sync count anomaly через кластеризацию `measuredAt` — в схеме нет отдельной сущности sync run, YELLOW-решение с обоснованием и явной оговоркой о приближённости
- Task 5.3: `src/dataQuality/temporalConsistency.ts` — чистая `checkTemporalConsistency`, `measuredAt` раньше `publishedAt` — временна́я невозможность
- Task 5.3: `src/dataQuality/schemaInvariants.ts` — чистая `findUniquenessViolations` + `checkSchemaInvariants`, нарушение уникальности `[platform, externalUserId]`/`[externalAccountId, externalContentId]` (defense in depth поверх уже существующих `@@unique`)
- Task 5.3: `tests/unit/data-quality-temporal-consistency.test.ts` — 6 тестов на синтетических данных
- Task 5.3: `tests/unit/data-quality-schema-invariants.test.ts` — 4 теста на синтетических данных
- Task 5.3: `tests/integration/data-quality-schema-invariants.smoke.test.ts` — реальная БД без нарушений + подтверждение, что настоящий дубликат отклоняется констрейнтом Postgres
- D-0017: consistency (`42_IMPLEMENTATION_ROADMAP.md` §27) нигде не расшифрована в `/docs` — независимая проверка подтвердила находку Olga, реализация по её явному предложению, не по цитате
- Task 6.1: `src/analysis/metricsAnalytics.ts` — чистые `summarizeMetric`/`computeMetricsAnalytics` (42_IMPLEMENTATION_ROADMAP.md §31–33), сумма/среднее/тренд по `reach`/`likes`/`saved` за период — первая реализация ANALYSIS layer
- Task 6.1: `src/analysis/accountAnalytics.ts` — `getUserAnalytics(userId, period)`
- Task 6.1: `src/app/api/analytics/route.ts` — `GET ?days=N`, session-protected
- Task 6.1: `tests/unit/metrics-analytics.test.ts` — 12 тестов на синтетических данных
- Task 6.1: `tests/integration/account-analytics.smoke.test.ts` — 2 теста против реальной БД, масштаб 25 публикаций
- D-0018: аналитика ограничена тремя метриками (`reach`/`likes`/`saved`) — `followers_gained` не собирается ingestion'ом; тренд через сравнение половин периода, относительный порог — YELLOW-решение с обоснованием
- Task 6.2: `src/analysis/metricRows.ts` — общий `MetricRow`/`latestValuesByContent`/`average`, вынесены из `metricsAnalytics.ts` во избежание циклического импорта с `personalBaseline.ts`
- Task 6.2: `src/analysis/personalBaseline.ts` — чистые `computeBaseline`/`confidenceFromSampleSize`/`compareToBaseline` (22_DATA_MODEL.md §13–14, 25_DATABASE_SCHEMA.md §16), personal baseline на лету + сравнение + confidence по объёму выборки
- Task 6.2: `tests/unit/personal-baseline.test.ts` — 16 тестов на синтетических данных
- D-0019: personal baseline вычисляется на лету (scope: global, без персистентности/версионирования из 25_DATABASE_SCHEMA.md §16–17); confidence — минимум из baseline и текущего периода — YELLOW-решение с обоснованием
- D-0020: forward-looking — тренд в `metricsAnalytics.ts` делит публикации по количеству, не по календарному времени; пересмотреть перед Recommendation Engine (Phase 8). Найдено при внешнем архитектурном review
- D-0021: forward-looking — `getUserAnalytics`/`getDataQualityStatus` делают по одному запросу на внешний аккаунт; пересмотреть, когда multi-account станет реальным сценарием. Найдено при внешнем архитектурном review
- Task 7.1: `src/knowledge/analyticsMemory.ts` — `captureAnalyticsMemory`/`formatFactContent` (42_IMPLEMENTATION_ROADMAP.md §35), первое реальное использование `Memory` (модель с Task 1.1, не использовалась ни разу)
- Task 7.1: `src/app/api/knowledge/capture/route.ts` — `POST ?days=N`, session-protected, state-changing
- Task 7.1: `tests/unit/analytics-memory.test.ts` — 2 теста на чистом форматировании контента
- Task 7.1: `tests/integration/analytics-memory.smoke.test.ts` — 3 теста против реальной БД
- D-0022: `Memory` покрывает 4 из 7 пунктов 42_IMPLEMENTATION_ROADMAP.md §35 (нет evidence references/outcome/relevance); confidence — числовая проекция категориальной шкалы по фиксированным значениям — YELLOW-решение с обоснованием
- Task 7.2: `src/knowledge/patternDetection.ts` — чистая `detectMetricPattern` + `detectPatterns` (26_DATA_PIPELINE.md §28–31), первое реальное использование `Pattern` (модель с Task 1.1, не использовалась ни разу)
- Task 7.2: `src/app/api/knowledge/patterns/route.ts` — `POST`, session-protected, state-changing
- Task 7.2: `tests/unit/pattern-detection.test.ts` — 7 тестов на синтетических данных
- Task 7.2: `tests/integration/pattern-detection.smoke.test.ts` — 3 теста против реальной БД, включая проверку upsert-семантики
- D-0023: `Pattern` — гранулярность на уровне публикации (не периода), upsert (не snapshot), §16 PATTERN_EVIDENCE и жизненный цикл §17–19 не реализованы — YELLOW-решение с обоснованием

### Fixed
- `INSTAGRAM_API_REVIEW.md` §3: исправлен вывод о permissions после того, как Olga лично прошла реальную авторизацию Instagram — insights оказался отдельным разрешением от `instagram_business_basic`, не его частью, как предполагала исходная версия резюме. Подтверждённый набор: `instagram_business_basic` + insights, comments/messages/content-publish осознанно отключены
- `src/integrations/IntegrationProvider.ts`: добавлено опциональное поле `metricType` в `IntegrationAccountInsightsParams` — найдено при реализации Task 3.2, что большинство account-level метрик, кроме `reach`, требуют явный `metric_type=total_value`, не было известно на Task 3.0/3.1
- `vitest.config.ts`: `.env` не грузился в `process.env` вообще — `DATABASE_URL` у прежних Prisma-тестов «работал» только случайно, как побочный эффект того, что `@prisma/client` сам грузит `.env` при первом импорте (и на весь процесс). Тест на Instagram (не импортирует Prisma) без этого не видел `INSTAGRAM_*`-переменные вообще. Исправлено явной загрузкой через `loadEnv` из `vite` (`test.env`) — общий фикс, полезен для любых будущих кастомных переменных, не костыль только под Instagram
- `src/integrations/providers/instagram.ts`: `exchangeForLongLivedToken`/`refreshTokens` строили URL через версионированный путь (`/v25.0/access_token`), хотя `INSTAGRAM_API_REVIEW.md` документирует эти endpoint'ы без версии — исправлено на отдельные неверсионированные константы (не устранило `Session key invalid`, но соответствует документации)
- **`Session key invalid` на `exchangeForLongLivedToken` — расследовано и закрыто.** Raw JSON-ответ (`type: OAuthException`, `code: 452`) подтвердил легаси-код Facebook Platform `API_EC_SESSION_INVALID`. Причина — токены из ручной кнопки "Generate Token" в Meta App Dashboard несовместимы с `ig_exchange_token`, не баг реализации: реальный browser OAuth round trip (`exchangeCodeForTokens`) прошёл чисто с первой попытки, токен на ~60 дней. В продакшене (реальные пользователи всегда идут через настоящий OAuth flow) не воспроизводится
- `src/integrations/providers/instagram.ts`: `listRecentMedia` не запрашивал `media_product_type` — `media_type` сам по себе не отличает Reels от обычного видео (оба приходят как `"VIDEO"`). Это эмпирический факт Instagram Graph API, обнаруженный при реализации Task 4.1 и подтверждённый живым запросом; отвечает ответственности adapter'а корректно транслировать внешний формат во внутренний (`26_DATA_PIPELINE.md` §10 PLATFORM_ADAPTER). *Исправление 13 августа 2026, по запросу Olga:* изначально здесь стояла ссылка на `08_METRICS_FRAMEWORK.md` §4 — при перепроверке выяснилось, что §4 говорит о другом (не сравнивать Reel и carousel одинаково при аналитическом сравнении, а не про определение типа контента при ingestion); ссылка была неточной и убрана, сама находка (`media_product_type`) остаётся в силе
- `src/ingestion/instagramSync.ts`: изначально не регистрировал Instagram-провайдер сам, полагаясь на `import '@/integrations/bootstrap'` в вызывающих route'ах — при прямом вызове (например из теста) падал с «No integration provider registered». Исправлено переносом side-effect import в сам модуль
- `src/integrations/providers/instagram.ts`: комментарий про «точное имя insights scope не подтверждено, URL не проверялся живым браузером» устарел — реальный OAuth round trip с этим `OAUTH_SCOPE` давно подтверждён (Task 3.2/3.4, `INSTAGRAM_API_REVIEW.md` §8 gap 2 закрыт 13 августа 2026). Найдено при внешнем архитектурном review (ChatGPT), комментарий обновлён на актуальное состояние знания
- `DECISIONS.md`: счётчик «46 документов» (3 места) исправлен на 45 — `First.md` изначально существовал только в Project Knowledge, не в репозитории `/docs`, и был удалён до начала работы над проектом, никогда не входил в реальный docs-аудит. Найдено при внешнем архитектурном review
- `DECISIONS.md` D-0022/`TASKS.md`/`CURRENT_STATUS.md`/`src/knowledge/analyticsMemory.ts`: ссылка «§37 MEMORY_EVIDENCE» в нескольких местах упоминалась без имени документа рядом с упоминаниями `42_IMPLEMENTATION_ROADMAP.md` §35/§37 — в `analyticsMemory.ts` дошло до того, что «§37» в одном комментарии означало два разных раздела двух разных документов (`25_DATABASE_SCHEMA.md` §37 MEMORY_EVIDENCE vs `42_IMPLEMENTATION_ROADMAP.md` §37 HISTORICAL DATA). Найдено Olga при независимой перепроверке цитаты — сама ссылка была верна по содержанию, добавлены явные имена документов везде, где было неоднозначно
- `src/knowledge/patternDetection.ts`: `lastConfirmedAt` изначально не устанавливался при первом создании `Pattern` (только при повторном `update`) — интеграционный тест (Task 7.2) поймал `null` там, где ожидалась дата. Исправлено — первое обнаружение тоже подтверждение, не только повторные

### Changed
- Task 2.2: `src/app/page.tsx` — стал async server component, показывает logged-in/logged-out состояние через `auth()`
- Task 2.2: `src/auth/config.ts` — добавлен `pages: { signIn: '/login' }`
- Task 2.3: `src/app/api/me/route.ts` отрефакторен на `requireSessionUserId()` (без изменения поведения)
- Task 2.3: `tests/e2e/auth-flow.spec.ts` — использует общий helper из `tests/e2e/helpers/auth.ts` вместо локальных дублей
- Task 3.2: пустая папка `src/integrations/instagram/` удалена — реальный адаптер лежит в `providers/instagram.ts`, как `providers/anthropic.ts`/`providers/r2.ts`, не в отдельной per-platform папке
- Task 3.3: `src/app/api/integrations/instagram/callback/route.ts` — переписан: требует сессию приложения (`requireSessionUserId()`), сохраняет/обновляет `ExternalAccount` через repository вместо простого показа raw JSON
- Task 3.3: `src/integrations/providers/instagram.ts` — приватный `fetchOwnIgUserId` переименован в `fetchAccountIdentity`, теперь возвращает и `username`, переиспользуется новым `getAccountIdentity`
- Task 3.4: `callback/route.ts` — добавлена проверка CSRF `state` против cookie, больше не отдаёт raw JSON, редиректит на `/integrations` с исходом в query
- Task 3.4: `src/app/page.tsx` — добавлена ссылка на `/integrations` для залогиненных пользователей
- Task 3.4 (дополнение): `callback/route.ts` сохраняет `identity.username`; `/integrations` показывает `Аккаунт: @username`
- Task 4.1: `src/app/integrations/page.tsx` — показывает `lastSyncedAt` и `<SyncButton />`
- Task 4.1: `src/app/api/integrations/instagram/sync/route.ts` — убран избыточный `import '@/integrations/bootstrap'` (теперь делает это `instagramSync.ts` сам)
- Task 4.2: `src/ingestion/instagramSync.ts` — после `getAccountInsights` теперь сохраняет метрики (включая `unavailableMetrics` → `value: null`) как `AccountSnapshot`, не только показывает в summary
- Task 4.2: `README.md` — добавлена ссылка на новый `DOCUMENT_CROSS_REFERENCE.md`
- Task 4.3: `src/integrations/providers/instagram.ts` — все 7 вызовов `fetch()` переведены на `fetchWithTimeout` (10с, `AbortController`)
- Task 4.3: `src/ingestion/instagramSync.ts` — `getAccountInsights`/`listRecentMedia`/`getMediaInsights` обёрнуты `withRetry`; `SyncWarning` дополнен `attempts`
- Task 5.1: `src/data/repositories/contentRepository.ts`/`performanceMetricRepository.ts`/`accountSnapshotRepository.ts` — новые read-only методы (`countByExternalAccountId`, `findLatestMeasuredAtByExternalAccountId`, `findLatestCapturedAt`) для data quality status
- Task 5.2: `src/data/repositories/performanceMetricRepository.ts` — `findRowsByExternalAccountId` заменил `findLatestMeasuredAtByExternalAccountId` из Task 5.1 (не использовался больше нигде) — один запрос сырых строк обслуживает freshness/completeness/anomaly detection разом
- Task 5.2: `src/dataQuality/dataQualityStatus.ts` — `AccountDataQualityStatus` дополнен `completeness`/`syncCountAnomaly`; `gaps` пополняется `incomplete_metrics`/`sync_count_anomaly`
- Task 5.3: `src/data/repositories/performanceMetricRepository.ts` — `findRowsByExternalAccountId` дополнен `publishedAt` (join через `Content`) для `temporalConsistency.ts`
- Task 5.3: `src/data/repositories/externalAccountRepository.ts`/`contentRepository.ts` — новые read-only методы группировки (`findPlatformExternalUserIdGroupCounts`, `findExternalContentIdGroupCounts`) для `schemaInvariants.ts`
- Task 5.3: `src/dataQuality/dataQualityStatus.ts` — `AccountDataQualityStatus` дополнен `temporalConsistency`; `gaps` пополняется `temporal_inconsistency`
- Task 5.3: `src/app/api/data-quality/route.ts` — ответ дополнен `schemaInvariantViolations` на верхнем уровне (не per-account, системная проверка)
- Task 6.1: `src/data/repositories/performanceMetricRepository.ts` — `findRowsByExternalAccountId` дополнен `metricType`
- Task 6.1: `src/analysis/README.md`/`src/README.md` — отражают первую реальную реализацию ANALYSIS layer
- Task 6.2: `src/analysis/metricsAnalytics.ts` — `MetricSummary` дополнен `baseline`/`comparisonToBaseline`/`confidence`; `summarizeMetric`/`average`/`latestValuesByContent` переиспользуют общий `metricRows.ts`
- Task 6.2: `src/app/api/analytics/route.ts` — ответ автоматически дополнен полями baseline/comparison через расширенный тип, без изменений логики route
- Task 7.1: `src/data/repositories/memoryRepository.ts` — `findByUserId` (раньше был только `findById`)
- Task 7.2: `src/data/repositories/patternRepository.ts` — `findByUserId` (раньше был только `findById`)
- Task 7.2: `src/data/repositories/performanceMetricRepository.ts` — `findRowsByUserId` (join через `Content.userId`, не через `ExternalAccount` — `Pattern` не привязан к конкретному внешнему аккаунту)
- Task 7.2: `src/knowledge/analyticsMemory.ts` — `CONFIDENCE_SCORE` экспортирована, переиспользуется `patternDetection.ts`
- **Phase 6 — Analytics Foundation закрыта** (решение Olga, 13 августа 2026) на объёме Task 6.1–6.2 — критерий §34 выполнен; per-metric «anomaly» из §33 сознательно не реализован, зафиксирован как задача Phase 7 (Pattern Detection, `26_DATA_PIPELINE.md` §29–31), не Analytics Foundation, см. `TASKS.md`
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
