# /src/analysis — ANALYSIS layer

Metric analysis, baseline, comparisons, temporal analysis, feature pipeline (`24_TECHNICAL_ARCHITECTURE.md` §25–29). Получает структурированные данные из `/src/data`, отдаёт результат в `/src/knowledge`.

## Task 6.1 — deterministic analytics (Phase 6, `42_IMPLEMENTATION_ROADMAP.md` §31–34)

Первая реальная реализация слоя. `metricsAnalytics.ts` — чистые функции (без сети/БД): сумма/среднее/тренд по трём основным метрикам (`reach`/`likes`/`saved`, `22_DATA_MODEL.md` §10 — `followers_gained` не собирается ingestion'ом, см. `DECISIONS.md` D-0018) за период. `accountAnalytics.ts` — тонкая оркестрация поверх `src/data/repositories`. Reproducible/testable/independent from AI (`42_IMPLEMENTATION_ROADMAP.md` §31–32) — не AI, обычный детерминированный код.

## Task 6.2 — personal baseline + сравнение (`22_DATA_MODEL.md` §13–14, `25_DATABASE_SCHEMA.md` §16)

`personalBaseline.ts` — `computeBaseline` (среднее по всей истории публикаций пользователя, scope: global, вычисляется на лету, не персистится — см. `DECISIONS.md` D-0019 за обоснованием сужения от полноценной `BASELINES`-сущности §16) + `compareToBaseline` (текущий период выше/ниже/на уровне нормы, confidence по объёму выборки — min из confidence baseline и confidence периода). `metricRows.ts` — общие тип строки и хелперы для `metricsAnalytics.ts`/`personalBaseline.ts` (вынесены отдельно, чтобы избежать циклического импорта между ними).

Дальше наполняется по мере реализации Phase 6 и Recommendation Engine.
