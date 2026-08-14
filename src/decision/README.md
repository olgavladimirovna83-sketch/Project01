# /src/decision — DECISION layer

Decision Engine: candidate generation, scoring, ranking (`24_TECHNICAL_ARCHITECTURE.md` §32–36, `13_RECOMMENDATION_ENGINE.md`). Получает подготовленные данные из ANALYSIS + KNOWLEDGE, не обходит базу самостоятельно.

## Task 8.1 — CANDIDATE_GENERATOR + CANDIDATE_SCORER + RANKING_ENGINE, первый шаг (`23_SYSTEM_ARCHITECTURE.md` §25–27, `21_DECISION_LOGIC.md` §9/§39–41)

Первая реальная реализация слоя. `candidateGenerator.ts` — кандидаты-форматы берутся из реально существующих `Content.contentType` пользователя, не из захардкоженного списка. `candidateScorer.ts` — сравнивает производительность каждого кандидата (формата) с личной нормой (Task 6.2, `scope: global`, не меняется) по каждой из трёх метрик отдельно; учитывает Pattern (Task 7.2) как контекстную пометку, не как отдельный фактор ранжирования. Только 3 из 9 документированных факторов CANDIDATE_SCORER реализованы (historical performance/сравнение с нормой/confidence) — честно, не притворяясь, что реализовано больше, см. `DECISIONS.md` D-0024. Результат — качественная метка (`label`), не выдуманное число (§40 NO FALSE PRECISION). `recommendationCandidates.ts` — оркестрация, read-only: **не пишет в `Recommendation`** — reasons/context/decision_version (`25_DATABASE_SCHEMA.md` §26/§28/§30) — следующий шаг.

Дальше наполняется по мере реализации остальных факторов CANDIDATE_SCORER (goal fit/freshness/repetition/risk/opportunity) и персистентности в `Recommendation`.
