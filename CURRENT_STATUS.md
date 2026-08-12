# CURRENT_STATUS.md

**Обновлено:** 12 августа 2026

## Текущая фаза
**Phase 0 — Project Foundation: завершена** (Task 0.1–0.6). Переход к **Phase 1 — Database Foundation** (Task 1.1). Критерий Task 0.6 «deploy в staging» сознательно отложен — продуктовое решение Olga (`DECISIONS.md`, D-0007), не блокирует Phase 1.

## Завершено
- Полная архитектурная и продуктовая спецификация (45 документов в `/docs`)
- Определена модель разработки (Olga / ChatGPT / Claude Code) и процесс Green/Yellow/Red
- Полный документальный аудит: все файлы прочитаны целиком, проверены на дубли и противоречия (`DECISIONS.md`, D-0002)
- Технологический стек MVP выбран и обоснован по 10-пунктному чек-листу (`DECISIONS.md`, D-0001)
- Независимый review от ChatGPT получен и принят: architecture/stack/DB/async/deployment/AI abstraction/documentation — все GREEN. Instagram/Auth boundary — YELLOW, требует отдельной проверки перед Phase 3 (`DECISIONS.md`, D-0003)
- Обязательные архитектурные границы из review закреплены в `CLAUDE.md` §4.1
- Task 0.1: git-репозиторий создан (local + remote GitHub, `origin/main`, история запушена), базовая структура папок на месте — `/docs`, `/src`, `/tests`
- Task 0.2: Next.js + TypeScript + Prisma scaffolding создан и верифицирован. Структура `/src` физически отражает слои (`data/analysis/knowledge/decision/ai/storage/integrations/learning` + `app/` как UI/API layer). Обязательные абстракции реализованы: `AIProvider`/`AIService` (единственный импорт `@anthropic-ai/sdk` — в `src/ai/providers/anthropic.ts`), `ObjectStorageService` (единственный импорт AWS S3 SDK — в `src/storage/providers/r2.ts`), Prisma Client singleton в `src/data/`, `ExternalIntegration` — пустая заготовка до Task 3.0. Верификация: `npm install` (373 пакета), `npx prisma generate`, `npx tsc --noEmit` (без ошибок), `npm run dev` (Ready in 2.6s, HTTP 200 на `/`) — все прошли успешно
- Task 0.3 (repo-часть): `ENVIRONMENTS.md` — стратегия трёх окружений (dev/staging/production), правило изоляции credentials/БД/Redis/storage по окружениям. `.env.example` расширен до полного набора переменных стека (Postgres, Redis, Auth.js, Anthropic, R2, Sentry) с комментариями по назначению и по окружению. `.gitignore` подтверждён (`.env`/`.env*.local` исключены)
- Task 0.4: `.github/workflows/ci.yml` — GitHub Actions pipeline на `pull_request`/`push` в `main`: `npm ci` → `npx prisma generate` → `npm run lint` → `npx tsc --noEmit` → `npm run build`. Все шаги проверены локально перед коммитом (lint — 0 warnings, build — успешен). Required status checks / branch protection на GitHub НЕ настроены — нет `gh` CLI и доступа к репозиторию в этом окружении, нужна ручная настройка Olga (см. «В работе»)
- D-0006: репозиторий перенесён на новый GitHub-аккаунт `olgavladimirovna83-sketch`, проект `Project01` (RED-действие, выполнено лично Olga; старый репозиторий `Olgavladimirovna83-create/Application` сохранён как резервный, не удалён)
- Task 0.5: тестовый фреймворк инициализирован — Vitest (`vitest.config.ts`, `tests/unit/`) и Playwright (`playwright.config.ts`, `tests/e2e/`), по одному smoke-тесту на каждый. `package.json`: `test`/`test:watch`/`test:e2e`. CI (`.github/workflows/ci.yml`) расширен шагами `npm test` и `npx playwright install --with-deps chromium` + `npm run test:e2e`. Проверено локально и подтверждено зелёным в GitHub Actions
- **Task 0.6: Phase 0 закрыта по всем локально проверяемым критериям (`42_IMPLEMENTATION_ROADMAP.md` §4) — запуск, тесты, сборка, безопасная конфигурация. Критерий «deploy в staging» отложен продуктовым решением Olga (`DECISIONS.md`, D-0007), перенесён в Backlog `TASKS.md`**

## В работе
- Task 1.1 — схема Prisma для core entities (Phase 1). Требует локального живого PostgreSQL — на момент начала не установлен (см. «Текущее окружение»).
- (Backlog, не блокирует Phase 1) Реальные staging/production ресурсы (Vercel, Neon, Upstash, R2) и branch protection для `main` — см. Backlog в `TASKS.md`, D-0007.

## Заблокировано
Task 1.1 (миграции) — нет локального PostgreSQL и нет Homebrew в этом окружении, чтобы его поставить. Требуется действие Olga (см. «Текущее окружение»).

## Известные проблемы / отложено (не блокирует Phase 0)
- `06_RECOMMENDATION_ENGINE.md` считается superseded от `13_RECOMMENDATION_ENGINE.md`
- Три пары документов — кандидаты на консолидацию после MVP (см. TASKS.md, Backlog)
- `First.md` — пустой файл в Project Knowledge; можно удалить (Olga подтвердила), удаляется через панель файлов проекта, не через этот чат
- PDF-приложения — материалы бренд-войса, не архитектурная документация
- `npm audit`: 3 high severity — транзитивные `postcss`/`sharp` через Next.js 15. Фикс требует мажорного апгрейда до Next.js 16 (`npm audit fix --force`), это не выполнено автоматически — решение об апгрейде откладывается, не блокирует Phase 0 (`DECISIONS.md`, D-0005; подтверждено ChatGPT при review завершения Task 0.2)

## Текущее окружение
Node.js v24.19.0 / npm 11.17.0 установлены (Olga, вручную через официальный установщик). Репозиторий: `github.com/olgavladimirovna83-sketch/Project01` (`origin/main`, см. D-0006). Зависимости установлены, dev-сервер и оба тестовых раннера верифицированы локально (CI подтверждён зелёным). PostgreSQL и Homebrew **не установлены** в этом окружении (`psql`/`brew` — command not found) — нужны для Task 1.1 (миграции требуют живой БД). Staging / production облачная инфраструктура сознательно отложена (D-0007).

## Следующая рекомендованная задача
Task 1.1 — схема Prisma для core entities. Заблокирована отсутствием локального PostgreSQL: нужно установить Homebrew (агент не бутстрапит его сам — `curl | bash` из недоверенного к выполнению агентом источника, см. переписку при установке Node), затем `brew install postgresql@16`. Как только Homebrew появится, дальнейшую установку Postgres агент может выполнить сам.
