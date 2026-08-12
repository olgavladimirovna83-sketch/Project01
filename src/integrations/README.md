# /src/integrations — ExternalIntegration adapters

Адаптеры внешних платформ (CLAUDE.md §3.2/§4.1: "ExternalIntegration-адаптеры"). Domain-код никогда не импортирует провайдерские SDK/HTTP-клиенты внешних платформ напрямую — только через `IntegrationService`.

- `IntegrationProvider.ts` — общий контракт (interface + вспомогательные типы/ошибки), который реализует каждый платформенный адаптер. Спроектирован по итогам Task 3.0 (`INSTAGRAM_API_REVIEW.md`) — формы методов отражают подтверждённое поведение Instagram Business Login, не общие предположения об OAuth
- `IntegrationService.ts` — domain-facing фасад, registry по `platform`. Регистрация конкретных провайдеров (`registerIntegrationProvider`) вынесена наружу — сам сервис не завязан на то, какие платформы уже реализованы
- `index.ts` — публичные экспорты (`IntegrationService` + типы; сами providers/* не реэкспортируются)
- `providers/instagram.ts` — конкретный адаптер для Instagram Business Login (Task 3.2), реализует `IntegrationProvider` против `api.instagram.com`/`graph.instagram.com`. `exchangeCodeForTokens` не проверен end-to-end (нужен полный browser OAuth round trip — следующий шаг); `refreshTokens`/`getAccountInsights`/`listRecentMedia`/`getMediaInsights` проверяются живым smoke-тестом (`tests/integration/instagram-live.smoke.test.ts`), если в `.env` заданы реальные credentials — иначе тест пропускается, не требует Instagram-секретов в CI

Мэппинг терминов: `IntegrationProvider`/`IntegrationService` — конкретная реализация `ExternalIntegration`-адаптеров из `CLAUDE.md` §4.1, названы по аналогии с `AIProvider`/`AIService` (`src/ai/`), не отдельная от них концепция.
