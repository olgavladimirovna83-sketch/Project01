# /src/knowledge — KNOWLEDGE layer

Хранит накопленные закономерности (patterns, baselines) отдельно от сырых данных (`24_TECHNICAL_ARCHITECTURE.md` §31). Ссылается на `/src/data`, но не заменяет её.

## Task 7.1 — первое использование `Memory` (`42_IMPLEMENTATION_ROADMAP.md` §35 PHASE 7)

`analyticsMemory.ts` — `captureAnalyticsMemory(userId, period)`: превращает вывод `src/analysis/accountAnalytics.ts` (Task 6.1/6.2) в персистентные `Memory`-записи (`memoryType: 'fact'`). `Memory`/`Pattern` — Prisma-модели с Task 1.1, до этой задачи ничем не заполнялись. Покрывает schema/timestamps/source/confidence из §35; evidence references/outcome/relevance — не покрыты, см. `DECISIONS.md` D-0022.

Дальше наполняется по мере реализации остальных пунктов Phase 7 (§36 KNOWLEDGE_WEIGHTING, §37 HISTORICAL_DATA, §38 USER_MEMORY) и Recommendation Engine (Phase 8).
