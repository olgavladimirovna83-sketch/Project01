# CURRENT_STATUS.md

**Обновлено:** 12 августа 2026

## Текущая фаза
Phase 0 — Project Foundation: **Task 0.1 и Task 0.2 завершены; Task 0.3 и Task 0.4 завершены в repo-части** (инфраструктурные/collaboration-настройки — staging-ресурсы и branch protection — за Olga)

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
- **Task 0.4: `.github/workflows/ci.yml` — GitHub Actions pipeline на `pull_request`/`push` в `main`: `npm ci` → `npx prisma generate` → `npm run lint` → `npx tsc --noEmit` → `npm run build`. Все шаги проверены локально перед коммитом (lint — 0 warnings, build — успешен). Required status checks / branch protection на GitHub НЕ настроены — нет `gh` CLI и доступа к репозиторию в этом окружении, нужна ручная настройка Olga (см. «В работе»)**

## В работе
- Task 0.3 (инфраструктурная часть) — создание реальных staging/production ресурсов (Vercel project, Neon-ветки, Upstash-инстансы, R2-buckets) требует доступа Olga к внешним дашбордам, у Claude Code нет аккаунтов/API-ключей этих сервисов.
- Task 0.4 (branch protection) — GitHub Settings → Branches → добавить правило для `main`, включить "Require status checks to pass before merging", выбрать check `Lint, type-check, build` (появится в списке после первого прогона workflow на PR). Это репозиторное/collaboration-настройка, которую агент не выполняет автоматически даже при наличии доступа (см. safety-правила про изменение shared-конфигурации) — плюс здесь физически нет `gh` CLI.

## Заблокировано
Нет (repo-часть Task 0.3 не заблокирована; создание реальной staging/production инфраструктуры — на стороне Olga, см. «В работе»)

## Известные проблемы / отложено (не блокирует Phase 0)
- `06_RECOMMENDATION_ENGINE.md` считается superseded от `13_RECOMMENDATION_ENGINE.md`
- Три пары документов — кандидаты на консолидацию после MVP (см. TASKS.md, Backlog)
- `First.md` — пустой файл в Project Knowledge; можно удалить (Olga подтвердила), удаляется через панель файлов проекта, не через этот чат
- PDF-приложения — материалы бренд-войса, не архитектурная документация
- `npm audit`: 3 high severity — транзитивные `postcss`/`sharp` через Next.js 15. Фикс требует мажорного апгрейда до Next.js 16 (`npm audit fix --force`), это не выполнено автоматически — решение об апгрейде откладывается, не блокирует Phase 0 (`DECISIONS.md`, D-0005; подтверждено ChatGPT при review завершения Task 0.2)

## Текущее окружение
Node.js v24.19.0 / npm 11.17.0 установлены (Olga, вручную через официальный установщик). Репозиторий создан (local + GitHub remote `origin/main`), зависимости установлены, dev-сервер верифицирован локально. Staging / production инфраструктура ещё не создана — стратегия и структура готовы (`ENVIRONMENTS.md`), фактическое создание проектов на Vercel/Neon/Upstash/R2 — за Olga.

## Следующая рекомендованная задача
Task 0.5 — инициализация тестового фреймворка (Vitest + Playwright). Параллельно, независимо от прогресса Claude Code: Olga создаёт staging/production ресурсы (`ENVIRONMENTS.md`) и включает branch protection для `main` в GitHub Settings.
