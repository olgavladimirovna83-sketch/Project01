# /src

Код приложения. Структура папок физически отражает границы слоёв из `CLAUDE.md` §3 (DATA → ANALYSIS → KNOWLEDGE → DECISION → AI → UI → LEARNING) и обязательные абстракции §4.1.

## Структура (Task 0.2)

- `app/` — Next.js App Router: UI-страницы + `app/api/` (route handlers = API layer). Единственная папка, которую видит фронтенд-бандл
- `data/` — DATA layer: Prisma Client singleton, репозитории (наполняются в Task 1.1)
- `analysis/` — ANALYSIS layer (Task 6.1 — первая реализация: `metricsAnalytics.ts`/`accountAnalytics.ts`, deterministic analytics)
- `knowledge/` — KNOWLEDGE layer (наполняется после Phase 1)
- `decision/` — DECISION layer / Decision Engine (наполняется после Phase 1)
- `ai/` — AI layer: `AIProvider` интерфейс, `AIService` (AI_SERVICE), `providers/anthropic.ts` (AI_PROVIDER_ADAPTER — единственный файл с прямым импортом `@anthropic-ai/sdk`)
- `storage/` — `ObjectStorageService`: интерфейс + `providers/r2.ts` (единственный файл с прямым импортом AWS S3 SDK)
- `integrations/` — `ExternalIntegration` adapters (CLAUDE.md §4.1): `IntegrationProvider` интерфейс + `IntegrationService` (Task 3.1), конкретный `providers/instagram.ts` (Task 3.2) — единственный файл с прямым обращением к `api.instagram.com`/`graph.instagram.com`
- `learning/` — LEARNING layer (наполняется после MVP recommendation flow)

Правило границ: domain-код (`analysis/`, `knowledge/`, `decision/`) импортирует `ai`, `storage`, `data` только через их `index.ts`/публичный интерфейс — никогда провайдерские файлы (`providers/*`) и никогда сторонние SDK напрямую (CLAUDE.md §4.1).
