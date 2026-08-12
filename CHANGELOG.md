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

### Changed
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

### Known issues
- `npm audit`: 3 high severity — транзитивные `postcss`/`sharp` через Next.js 15; фикс требует мажорного апгрейда до Next.js 16, не выполнен автоматически (решение об апгрейде — отдельно, не блокирует Phase 0; см. `DECISIONS.md`, D-0005)
- `next lint` помечен deprecated, будет удалён в Next.js 16 — при будущем апгрейде (см. пункт выше) потребуется миграция на ESLint CLI напрямую (`npx @next/codemod@canary next-lint-to-eslint-cli .`)
- Task 0.3 не завершена полностью: реальные staging/production ресурсы (Vercel, Neon, Upstash, R2) не созданы — требуют доступа Olga к внешним дашбордам, вне возможностей Claude Code сессии
- Task 0.4: required status checks / branch protection для `main` не настроены — нет `gh` CLI и это repo-настройка, которую агент не включает самостоятельно (см. CURRENT_STATUS.md)
- `vitest.config.ts` при запуске выводит предупреждение о будущей смене дефолтного `configLoader` в Vite (ESM-конфиг, загружаемый как CommonJS) — не ошибка, не блокирует тесты, безопасно отложить
