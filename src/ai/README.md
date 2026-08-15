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

## Task 9.4 — content suggestion, вторая AI-задача (первое использование `ContentKnowledge`)

`contentSuggestionPrompt.ts` — `buildContentSuggestionPrompt`: генерирует конкретные варианты хуков/заголовков для темы, используя ТОЛЬКО реально загруженные (Task 9.3) `ContentKnowledge`-записи (по умолчанию `hook_template`+`headline_rule`) — прямой запрет придумывать приёмы копирайтинга сверх переданных (§16/§20). `contentSuggestionValidation.ts` — `parseContentSuggestions`: структурная валидация (непустой массив `{text, basedOn}`), не проверяет, действительно ли `basedOn` соответствует реальному приёму — та же граница ответственности промпт/валидация, что Task 9.1. `contentSuggestion.ts` — `generateContentSuggestions(topic, userId, category?, generate)`: честные состояния без AI-вызова — `invalid_topic` (пустая тема) и `no_knowledge_available` (нет активных записей под категорию), AI не вызывается и `AiRun` не создаётся ни в одном из этих случаев.

`AiRun` (Task 9.1) обобщена этой задачей: `recommendationId` стал опциональным, добавлены `userId` (иначе AI-run для генерации текста был бы анонимным) и `inputContext` (буквальный пункт §24 "input context reference", не реализованный в Task 9.1). См. `DECISIONS.md` D-0031.

`POST /api/ai/content-suggestions`. Живая ручная проверка (не только тесты) подтвердила весь пайплайн через реально запущенный dev-сервер: реальная сессия → реальный `ContentKnowledge` (Task 9.3) → реальный `AIService.generate` → честный `provider_unavailable` (нет `ANTHROPIC_API_KEY` в этом окружении) → реальная запись `AiRun` с верным `input_context`. Собственно генерация реального текста нуждается в реальном ключе Anthropic — не настроен здесь, см. `TASKS.md` Task 9.4.
