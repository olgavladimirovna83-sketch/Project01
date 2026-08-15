# /src/ai — AI layer

`AI_SERVICE → AI_PROVIDER_ADAPTER → AI PROVIDER → MODEL` (`29_AI_LAYER.md` §2, CLAUDE.md §4.1).

- `AIProvider.ts` — интерфейс адаптера (контракт, не реализация)
- `AIService.ts` — `AI_SERVICE`, единственная точка входа для domain-кода
- `providers/anthropic.ts` — `AI_PROVIDER_ADAPTER` для Anthropic Claude API; единственный файл в проекте, которому разрешено импортировать `@anthropic-ai/sdk`
- `index.ts` — публичный экспорт: `AIService` + типы. Провайдерские адаптеры не реэкспортируются

Recommendation Engine, Analysis Engine и другие domain-компоненты импортируют только `src/ai` (или `@/ai` через путь), никогда `src/ai/providers/*` и никогда `@anthropic-ai/sdk` напрямую.

Замена провайдера (см. `29_AI_LAYER.md` §7) — новый файл в `providers/`, реализующий `AIProvider`, плюс переключение в `AIService.ts`. Остальной код не меняется.

## Task 9.1 — decision explanation, первое реальное использование `AIService`

`decisionExplanationPrompt.ts` — `buildExplanationPrompt`: собирает промпт для объяснения уже сохранённой (Task 8.3) `Recommendation` по структуре §50 DECISION EXPLANATION (`21_DECISION_LOGIC.md`, не `29_AI_LAYER.md` — уточнение цитаты, номер раздела совпал случайно) — Recommendation → Why now → Evidence → Expected benefit → Uncertainty. Evidence — реальные `RecommendationReason` (Task 8.3), не пересказ; confidence — качественная метка из `context.ranking` (Task 8.1/8.3), не голое число (риск псевдо-статистики, §35 EXPLANATION MUST NOT INVENT). `decisionExplanationValidation.ts` — `parseExplanation`: структурная валидация output до персистентности (§11/§26) — 4 обязательных строковых поля, не проверяет честность содержания (это ответственность промпта). `decisionExplanation.ts` — `generateDecisionExplanation(recommendationId, userId, generate = AIService.generate)`: читает `Recommendation` (никогда не пишет в неё — §67/§68), пишет только в новую `AiRun` (append-only лог, любой исход, не только успех — §24/§76). `generate` — DI-параметр для тестов, реальный `AIService` недетерминирован и стоит денег. `POST /api/decision/recommendations/[id]/explain`. См. `DECISIONS.md` D-0028.
