# INSTAGRAM_API_REVIEW.md — Task 3.0: техническая проверка Instagram/Meta Graph API

**Дата:** 12 августа 2026
**Статус:** Завершено (research-only, без реализации)
**Автор:** Claude Code, по запросу Olga, до старта Phase 3 (`TASKS.md`, Task 3.0; `CLAUDE.md` §3.2/§4.1)

## Назначение документа

Письменное резюме по актуальным (на дату проверки) требованиям Meta/Instagram API: какие permissions запрашивать, какие данные реально доступны, как устроен token lifecycle, какие rate limits и webhook-возможности есть. Источник для будущего проектирования `Integration Service` (`src/integrations/`, пока пустая заготовка). Это **не реализация** и не создание Meta developer-аккаунта/приложения — то и другое остаётся RED до отдельного разрешения Olga (`CLAUDE.md` §8, `DECISIONS.md` D-0003).

Все ссылки — на `developers.facebook.com` (официальная документация Meta) на момент проверки. API этой платформы меняется быстро (см. §7 ниже — часть метрик deprecated буквально в 2025 году) — перед реализацией Integration Service стоит перепроверить актуальность, если между этим документом и стартом реализации пройдёт значительное время.

---

## 1. Требования к аккаунту

- API обслуживает **только Instagram professional accounts** — Business или Creator. **Personal-аккаунты не имеют доступа к API вообще** (0 permissions).
- Конвертация personal → professional делается пользователем внутри самого приложения Instagram (Settings → Account type), не требует ничего от нашей стороны технически — но это шаг, который нужно объяснить пользователю в UI onboarding (отдельная будущая задача, не Integration Service как таковой).
- Два разных способа подключения к API:
  - **Business Login for Instagram** (современный, рекомендованный путь) — пользователь логинится напрямую своими Instagram-credentials, **Facebook Page не требуется**. Все endpoints — через хост `graph.instagram.com`.
  - **Facebook Login for Business** (старый путь) — пользователь логинится через Facebook, Instagram-аккаунт должен быть **привязан к Facebook Page**. Более сложный onboarding для пользователя (дополнительная привязка через Meta Business Suite).
  - **Рекомендация для нашего продукта:** Business Login — не требует от пользователя иметь/привязывать Facebook Page, что заметно снижает трение при подключении аккаунта (прямое попадание в продуктовую цель — рост, не бюрократия). Это YELLOW-наблюдение для будущего архитектурного решения, не встраивается в DECISIONS.md сейчас, так как реализации ещё нет — фиксируется здесь как рекомендация к моменту проектирования Integration Service.

---

## 2. OAuth / Authorization flow (Business Login)

1. Пользователь направляется на `https://www.instagram.com/oauth/authorize` с параметрами: `client_id`, `redirect_uri` (должен точно совпадать с настроенным в App Dashboard), `response_type=code`, `scope` (список permissions через запятую). Опционально: `state` (CSRF-защита — обязательно использовать), `force_reauth`.
2. При согласии пользователя — редирект на `redirect_uri` с `code` (одноразовый, живёт 1 час).
3. Обмен `code` на **short-lived access token** — `POST https://api.instagram.com/oauth/access_token` (client_id/client_secret/redirect_uri/code). Токен живёт **~1 час**.
4. Обмен short-lived → **long-lived token** — `GET https://graph.instagram.com/access_token` с `grant_type=ig_exchange_token`, `client_secret`, `access_token`. Живёт **60 дней**. Это должно выполняться **только server-side** (запрос содержит app secret — официальная документация прямо предупреждает не делать это в client-side коде).

---

## 3. Permissions (актуальные scope, Business Login)

Старые scope-имена (`instagram_basic`, `instagram_manage_insights` и т.п. из Facebook Login-эры) заменены на 2025–2026:

| Scope | Даёт доступ к |
|---|---|
| `instagram_business_basic` | Базовая идентификация аккаунта, обязателен почти для всех остальных вызовов (в т.ч. refresh token) |
| `instagram_business_content_publish` | Публикация контента через API — **не нужен** для MVP-цели продукта (аналитика/рекомендации, не постинг от лица пользователя) |
| `instagram_business_manage_messages` | Direct-сообщения — не нужен для MVP-цели |
| `instagram_business_manage_comments` | Управление комментариями — не нужен напрямую, но может пригодиться, если продукт когда-либо будет анализировать комментарии как данные (см. `docs/08_METRICS_FRAMEWORK.md` упоминает comments как метрику — для **чтения** метрики `comments` отдельный content-publish/comments scope не требуется, это часть insights)

**Вывод для MVP:** для целей этого продукта (сбор метрик, не постинг/не messaging) реально нужен, по всей видимости, только `instagram_business_basic` — он даёт доступ к профилю и, вместе с ним, к insights endpoints. Точный минимальный набор scope стоит подтвердить эмпирически при первой реализации (создание тестового Meta-приложения — отдельный RED-шаг, ждёт Olga), т.к. официальная документация не всегда даёт однозначную scope-to-endpoint матрицу.

### Standard vs Advanced Access — важно для продуктовой модели

- **Standard Access** (по умолчанию) — работает только с аккаунтами, у которых есть роль в самом Meta-приложении (владелец/тестировщик, вручную добавленные в App Dashboard) или которые сам разработчик прямо "owns/manages". Достаточно для разработки и для тестирования на собственном/нескольких добавленных вручную аккаунтах.
- **Advanced Access** — обязателен, если приложение должно обслуживать Instagram-аккаунты **сторонних пользователей**, не имеющих роли в приложении. **Это наш случай** — продукт по определению подключает чужие (по отношению к Meta-приложению) Instagram-аккаунты разных пользователей.
- Advanced Access выдаётся только через **Meta App Review**, который требует: **Business Verification** (верификация юрлица/бизнеса), режим приложения — Live, privacy policy, data-deletion path.
- **Важное следствие для планирования:** локальная разработка и тестирование Integration Service возможны на Standard Access с вручную добавленными тестовыми аккаунтами (например, личный Instagram-аккаунт Olga, добавленный как test user) — это не блокирует Phase 3/4 разработку. Но **запуск для реальных пользователей продукта потребует пройти App Review + Business Verification** — процесс с реальным lead time и требованием зарегистрированного юрлица. Это не техническая, а организационная/продуктовая зависимость — стоит учитывать в планировании MVP launch, не только в архитектуре. Не блокирует текущую фазу, но стоит знать заранее.

---

## 4. Token lifecycle

| Событие | Детали |
|---|---|
| Short-lived token | Выдаётся при обмене `code`, живёт **~1 час** |
| Long-lived token | Обмен short-lived → long-lived, живёт **60 дней** |
| Refresh | `GET https://graph.instagram.com/refresh_access_token`, `grant_type=ig_refresh_token`, требует `instagram_business_basic`. Токен должен быть **не моложе 24 часов и не истёкшим**. После refresh — снова 60 дней от даты refresh |
| Рекомендация индустрии (не из офиц. доков) | Автоматический refresh каждые 50–55 дней — оставляет запас на случай сбоя джобы |
| Истечение без refresh | Официальная документация явно не описывает этот сценарий (пробел в доках, зафиксирован как gap ниже) — по общей логике OAuth 2.0 нужно предполагать, что потребуется полная повторная авторизация пользователя (redirect на `/oauth/authorize` заново). Проектировать Integration Service нужно с расчётом на этот сценарий: если refresh не удался (например, пользователь не заходил > 60 дней), sync job должен корректно перейти в terminal-состояние "требуется reconnect", не падать молча |
| Revocation | Официальная документация по этому конкретному endpoint не найдена при этой проверке (ещё один gap, см. ниже) — пользователь может отозвать доступ через настройки Instagram/Meta вне нашего контроля в любой момент; Integration Service должен уметь корректно обработать `401`/`403` от API как сигнал "токен отозван", а не как временную ошибку sync job |

**Прямое следствие для §3.3 CLAUDE.md (async processing requirements):** idempotency/retry/dedup/rate limiting обязательны для sync-джобы по общему правилу — но **токен-инвалидация обязана быть отдельным terminal-состоянием**, не retry-циклом, иначе job будет бесконечно ретраить безнадёжный запрос.

---

## 5. Доступные метрики vs `docs/08_METRICS_FRAMEWORK.md`

`08_METRICS_FRAMEWORK.md` описывает желаемые метрики на уровне продукта (account-level, publication-level, format-specific). Ниже — сопоставление с тем, что реально отдаёт API **на текущую версию** (важно: часть метрик, которые могли быть в API исторически, **deprecated с апреля 2025**, поэтому нельзя проектировать по памяти/старым туториалам).

### Account-level insights (`GET /{ig-user-id}/insights`)

Доступные метрики: `accounts_engaged`, `comments`, `likes`, `reach`, `replies`, `reposts`, `saves`, `shares`, `total_interactions`, `views`, `profile_links_taps`, плюс `lifetime`-метрики `engaged_audience_demographics` и `follower_demographics` (обе требуют **≥100 подписчиков** и минимум вовлечений/подписчиков в периоде).

**Deprecated:** `impressions` — полностью выведен из всех версий API к 21 апреля 2025, заменён на `views`. Аналогично deprecated: `email_contacts`, `phone_call_clicks`, `text_message_clicks`, `get_directions_clicks`, `website_clicks`, `profile_views`.

**Прямое следствие для `08_METRICS_FRAMEWORK.md`:** документ явно называет "impressions", "profile visits", "website or external link activity" как желаемые метрики (§2). `impressions` как отдельная метрика **больше не существует в API** — нужно использовать `views` при реализации Analysis/Data layer, спецификация продукта написана до этого изменения API. Это не противоречие продуктовому решению (документ сам говорит "exact available metrics may vary depending on Instagram's API capabilities" — §2, и "system should adapt to metrics actually available" — там же), просто конкретное маппирование нужно будет сделать на этапе реализации Data layer, не сейчас.

### Media-level insights (`GET /{ig-media-id}/insights`), по типу медиа

- **FEED (фото/карусель-обложка):** `comments`, `likes`, `reach`, `profile_visits`, `profile_activity`, `reposts`, `saved`, `shares`, `total_interactions`, `views`. `impressions` — deprecated для медиа, опубликованных после 2 июля 2024.
- **REELS:** всё из FEED + `ig_reels_avg_watch_time`, `ig_reels_video_view_total_time`, `reels_skip_rate`.
- **STORIES:** `comments`, `reach`, `reposts`, `shares`, `total_interactions`, `follows`, `link_clicks`, `navigation`, `profile_visits`, `profile_activity`, `views`. `replies` — недоступны в EU/Japan и исчезают через 24 часа.
- **ALBUMS (карусели как контейнер):** insights для самого альбома-контейнера не поддерживаются — нужно агрегировать по дочерним медиа отдельно (важная деталь для Integration Service/Analysis layer).

**Прямое следствие для `08_METRICS_FRAMEWORK.md` §4 (Format-Specific Metrics):** документ прав, что форматы нужно различать — API это подтверждает буквально на уровне разных наборов метрик per media type. Reels имеют уникальные watch-time/skip-rate метрики, которых физически нет у обычных постов — усиливает требование "не сравнивать Reel и carousel одинаково" из документа.

### Historical data / период хранения

- User-level insights data хранится Instagram **до 90 дней** — это напрямую ограничивает "initial sync ~3 месяца" из `08_METRICS_FRAMEWORK.md` §12: **90 дней — это верхняя граница того, что вообще можно забрать при первом подключении**, не наша архитектурная опция. Данные старше 90 дней на момент подключения физически недоступны через API, если не были собраны нашей системой раньше.

---

## 6. Rate limits

- Все endpoints (кроме messaging, Business Discovery, Hashtag Search) — под **Instagram Business Use Case rate limiting**: `Calls within 24h = 4800 × impressions аккаунта пользователя за последние 24ч`. Для аккаунтов с низким охватом это может быть довольно тесным лимитом — Integration Service должен на это рассчитывать, не предполагать фиксированный лимит на всех пользователей одинаково.
- Превышение — ошибка **80002**.
- Текущее использование лимита возвращается в заголовке ответа `X-Business-Use-Case-Usage` (`call_count`, `total_cputime`, `total_time`, `estimated_time_to_regain_access`) — Integration Service должен читать и учитывать этот заголовок проактивно, не дожидаться первой ошибки 80002.
- Messaging endpoints (не нужны для MVP) — отдельные лимиты per-second/per-hour, не рассматриваю подробно, т.к. вне scope продукта на этом этапе.

**Прямое следствие для CLAUDE.md §3.3 (async processing):** rate limiting для Instagram sync — не абстрактное требование, а конкретно: следить за `X-Business-Use-Case-Usage`, rate limit пропорционален охвату конкретного пользователя (не общий лимит на приложение), значит rate limiting должен быть **per-connected-account**, не глобальным на всё приложение.

---

## 7. Webhooks

Доступны: comments, mentions, story insights (`media_id`, `exits`, `replies`, `reach`, `taps_forward`, `taps_back`; отметить, что `impressions` в этом списке тоже устаревшее поле — см. §5). Payload подписывается `X-Hub-Signature-256` (HMAC-SHA256 app secret) — обязательно проверять подпись при реализации, если webhooks будут использоваться.

**Недоступны через webhooks:** изменение числа подписчиков, публикация нового поста, лайки, отписки, real-time просмотры историй.

**Вывод для продукта:** webhooks не покрывают наш главный кейс — регулярный сбор performance-метрик (лайки/охваты/подписчики). Для этого остаётся **polling через incremental sync** (`26_DATA_PIPELINE.md` §21–23, уже заложено в архитектуру пайплайна), не push. Webhooks могут быть полезны позже для комментариев/упоминаний как отдельного типа данных, но не заменяют основной sync-механизм. Это подтверждает, а не меняет, уже выбранную архитектуру (BullMQ-джобы на incremental sync, D-0001).

---

## 8. Пробелы в этой проверке (честно, не дораследовано)

Официальная документация Meta местами неполна или недоступна без аутентифицированного доступа к Developer Console — не всё удалось проверить исчерпывающе за один заход:

1. **Явный endpoint/механизм revocation** (что именно вызывает наше приложение, если пользователь хочет отключить аккаунт из нашего продукта, не через настройки Instagram) — не найден в открытой документации при этой проверке. Нужно проверить отдельно при реализации Integration Service, возможно через Meta Business SDK или `DELETE /{user-id}/permissions`-подобный endpoint по аналогии с классическим Facebook Graph API.
2. **Точная scope-to-endpoint матрица** — официальная документация не даёт однозначного списка "какой scope открывает какой конкретно insights-endpoint". Предположение (только `instagram_business_basic` достаточен для read-only insights) требует эмпирической проверки на тестовом приложении.
3. **Полный список deprecated media-insights метрик** взят из нескольких источников (включая вторичные, не только `developers.facebook.com`) — таблица в §5 должна быть перепроверена по официальному API Reference непосредственно перед реализацией, если пройдёт много времени.

Эти пробелы не блокируют Phase 3 планирование, но их стоит закрыть при непосредственной технической реализации Integration Service (не раньше, чем появится тестовое Meta-приложение — то есть после явного разрешения Olga).

---

## 9. Итог: что это значит для Integration Service (не архитектурное решение, заметки на будущее)

- Business Login (не Facebook Login) — предпочтительный путь по UX (нет Facebook Page requirement).
- Достаточно, вероятно, одного scope: `instagram_business_basic`.
- Token lifecycle: 1ч → 60д → refresh каждые ~50 дней проактивно, plus graceful handling истёкшего токена как terminal-state, требующего reconnect от пользователя, не silent retry.
- Данные глубже 90 дней в момент первого подключения физически недоступны — `08_METRICS_FRAMEWORK.md` §12 ("~3 месяца") реалистичен и совпадает с лимитом API, а не является более амбициозной целью, чем позволяет платформа.
- `impressions` как имя метрики использовать нельзя — везде `views`.
- Rate limiting должен быть per-account (пропорционален охвату конкретного пользователя), не глобальным.
- Реальный запуск для сторонних пользователей потребует Meta App Review + Business Verification — организационный, не только технический шаг, стоит знать заранее при планировании таймлайна MVP launch.
- Webhooks не заменяют polling/incremental sync для performance-метрик — архитектура `26_DATA_PIPELINE.md` (incremental sync через джобы) остаётся верной, не пересматривается.

---

## Источники

- [Overview of the Instagram API](https://developers.facebook.com/docs/instagram-platform/overview/)
- [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Access Token reference](https://developers.facebook.com/docs/instagram-platform/reference/access_token/)
- [Refresh Access Token reference](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/)
- [Instagram Platform Insights overview](https://developers.facebook.com/docs/instagram-platform/insights/)
- [Instagram Media Insights reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/)
- [Instagram User (account-level) Insights reference](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights/)
- [Graph API Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)
- [Webhooks Reference: Instagram](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram)
- [Instagram Webhooks (Facebook Login variant)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/webhooks/)
