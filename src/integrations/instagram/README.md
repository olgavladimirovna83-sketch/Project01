# /src/integrations/instagram

Пусто намеренно — на очереди конкретный адаптер, реализующий `IntegrationProvider` (`../IntegrationProvider.ts`) для Instagram Business Login.

Task 3.0 (`INSTAGRAM_API_REVIEW.md`) и последующее уточнение от Olga (реальная авторизация, `TASKS.md` Task 3.0) дают достаточно подтверждённых деталей, чтобы написать код против документированных endpoints (`https://www.instagram.com/oauth/authorize`, `https://api.instagram.com/oauth/access_token`, `https://graph.instagram.com/access_token`, `/refresh_access_token`, `/{ig-user-id}/insights`, `/{ig-media-id}/insights`) — но код нельзя будет исполнить end-to-end (получить реальный `code`/токен) без настоящего Meta-приложения. Создание Meta developer-аккаунта/приложения — RED, отдельное разрешение Olga (`CLAUDE.md` §8, та же логика, что D-0003/D-0006/D-0009). До этого адаптер можно написать и типизировать, но не проверить интеграционным тестом с реальным Instagram.

Permissions, подтверждённые Olga для запроса при реальной авторизации: `instagram_business_basic` (обязательный) + отдельное insights-разрешение. Comments/messages/content-publish — не запрашиваются (см. `INSTAGRAM_API_REVIEW.md` §3).
