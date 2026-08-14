# /src/knowledge — KNOWLEDGE layer

Хранит накопленные закономерности (patterns, baselines) отдельно от сырых данных (`24_TECHNICAL_ARCHITECTURE.md` §31). Ссылается на `/src/data`, но не заменяет её.

## Task 7.1 — первое использование `Memory` (`42_IMPLEMENTATION_ROADMAP.md` §35 PHASE 7)

`analyticsMemory.ts` — `captureAnalyticsMemory(userId, period)`: превращает вывод `src/analysis/accountAnalytics.ts` (Task 6.1/6.2) в персистентные `Memory`-записи (`memoryType: 'fact'`). `Memory`/`Pattern` — Prisma-модели с Task 1.1, до этой задачи ничем не заполнялись. Покрывает schema/timestamps/source/confidence из §35; evidence references/outcome/relevance — не покрыты, см. `DECISIONS.md` D-0022.

## Task 7.2 — Pattern Detection, первый шаг (`26_DATA_PIPELINE.md` §28–31)

`patternDetection.ts` — `detectPatterns(userId)`: первое использование `Pattern`. Простая частотная закономерность на уровне отдельной публикации (не периода) — систематически выше/ниже personal baseline (Task 6.2) для каждой из трёх основных метрик. Upsert по `(userId, patternType)`, не snapshot — единственная эволюционирующая запись, а не новая строка на прогон (`22_DATA_MODEL.md` §18 PATTERN_DECAY). Жизненный цикл (§17 PATTERN_STATUS/§18/§19), комбинации признаков и формальные evidence references (§16 PATTERN_EVIDENCE) — сознательно отложены, см. `DECISIONS.md` D-0023.

## Task 7.3 — единый ответ «что мы знаем и почему» (`42_IMPLEMENTATION_ROADMAP.md` §39 PHASE 7 COMPLETION)

`userKnowledge.ts` — `getUserKnowledge(userId)`: до этой задачи `Memory`/`Pattern` существовали только за write-триггерами (`analyticsMemory.ts`/`patternDetection.ts`, оба возвращают счётчики, не записи) — не было способа реально прочитать накопленное знание через приложение, критерий §39 не выполнялся буквально. `GET /api/knowledge` — первый read-only доступ к обеим сущностям разом. Phase 7 закрыта на этом объёме — см. `TASKS.md`.

Дальше — §36 KNOWLEDGE_WEIGHTING/§37 HISTORICAL_DATA/§38 USER_MEMORY, жизненный цикл Pattern (§17–19) и формальные evidence references (§16/§37 MEMORY_EVIDENCE) остаются документированными, но не реализованными — возвращаются по мере практической необходимости, естественно всплывут при Recommendation Engine (Phase 8).
