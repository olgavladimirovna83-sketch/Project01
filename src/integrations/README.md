# /src/integrations — ExternalIntegration adapters

Адаптеры внешних платформ (CLAUDE.md §3.2/§4.1: "ExternalIntegration-адаптеры"). Domain-код никогда не импортирует провайдерские SDK/HTTP-клиенты внешних платформ напрямую — только через `IntegrationService`.

- `IntegrationProvider.ts` — общий контракт (interface + вспомогательные типы/ошибки), который реализует каждый платформенный адаптер. Спроектирован по итогам Task 3.0 (`INSTAGRAM_API_REVIEW.md`) — формы методов отражают подтверждённое поведение Instagram Business Login, не общие предположения об OAuth
- `IntegrationService.ts` — domain-facing фасад, registry по `platform`. Регистрация конкретных провайдеров (`registerIntegrationProvider`) вынесена наружу — сам сервис не завязан на то, какие платформы уже реализованы
- `index.ts` — публичные экспорты (`IntegrationService` + типы; сами providers/* не реэкспортируются)
- `instagram/` — конкретный адаптер для Instagram, следующий шаг после дизайна контракта (см. `TASKS.md`, Task 3.1)

Мэппинг терминов: `IntegrationProvider`/`IntegrationService` — конкретная реализация `ExternalIntegration`-адаптеров из `CLAUDE.md` §4.1, названы по аналогии с `AIProvider`/`AIService` (`src/ai/`), не отдельная от них концепция.
