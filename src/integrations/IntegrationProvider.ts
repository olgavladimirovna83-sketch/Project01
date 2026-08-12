/**
 * Общий контракт для интеграций с внешними платформами (Instagram сейчас,
 * другие платформы позже — `08_METRICS_FRAMEWORK.md` §16 прямо предполагает
 * TikTok и подобные в будущем без пересмотра архитектуры). Instagram
 * Integration ≠ App Authentication — это отдельный слой: OAuth authorization,
 * permissions, access tokens, token lifecycle, API requests, синхронизация,
 * rate limits (CLAUDE.md §3.2/§4.1).
 *
 * Domain-код (Data/Analysis/Decision/AI/Learning layers) никогда не
 * импортирует providers/* или платформенные SDK/HTTP-клиенты напрямую —
 * только через IntegrationService.
 *
 * Формы методов и типов ниже отражают то, что подтверждено по Instagram
 * Business Login в Task 3.0 (`INSTAGRAM_API_REVIEW.md`), а не общие
 * предположения о том, как "обычно" устроены OAuth-интеграции.
 */

export type IntegrationPlatform = 'instagram';

export interface IntegrationTokens {
  accessToken: string;
  /** Когда токен был выдан/обновлён — нужно для правила "refresh не раньше
   * 24ч после выдачи" (INSTAGRAM_API_REVIEW.md §4). */
  obtainedAt: Date;
  expiresAt: Date;
}

/** Локальная проверка по expiresAt — не требует сетевого запроса. Отзыв
 * токена пользователем локально не определяется — это обнаруживается только
 * по факту ответа платформы, см. IntegrationAuthError ниже. Отдельного
 * метода "проверить, не отозван ли токен" в контракте нет намеренно, чтобы
 * не поощрять лишний sync-запрос только ради проверки. */
export function isTokenExpired(tokens: IntegrationTokens): boolean {
  return tokens.expiresAt.getTime() <= Date.now();
}

/**
 * Провайдер обязан выбрасывать эту ошибку (не generic Error), когда
 * платформа отвечает, что токен недействителен/отозван (401/403 и подобные)
 * — чтобы вызывающий код (sync job) мог отличить "нужен reconnect
 * пользователя" (terminal state) от временной ошибки, которую стоит
 * ретраить (CLAUDE.md §3.3; INSTAGRAM_API_REVIEW.md §4, §8).
 */
export class IntegrationAuthError extends Error {
  constructor(
    public readonly platform: IntegrationPlatform,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Провайдер обязан выбрасывать эту ошибку при rate limit — отдельно от
 * IntegrationAuthError, чтобы вызывающий код ретраил с backoff, а не считал
 * это terminal state (INSTAGRAM_API_REVIEW.md §6).
 */
export class IntegrationRateLimitError extends Error {
  constructor(
    public readonly platform: IntegrationPlatform,
    message: string,
    /** Секунды до вероятного восстановления доступа, если платформа их
     * сообщает (например, X-Business-Use-Case-Usage.estimated_time_to_regain_access). */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export interface IntegrationInsightsMetric {
  name: string;
  value: number;
  period: string;
}

export interface IntegrationInsightsResult {
  metrics: IntegrationInsightsMetric[];
  /** Метрики, которые были запрошены, но платформа их не вернула (deprecated,
   * недоступны для этого account/media type и т.п.) — различие "данных нет"
   * vs "данные не запрашивались" (`08_METRICS_FRAMEWORK.md` §11). */
  unavailableMetrics: string[];
}

export interface IntegrationMediaSummary {
  externalId: string;
  mediaType: string;
  publishedAt: Date;
}

export interface IntegrationAuthorizationUrlParams {
  redirectUri: string;
  /** CSRF-защита OAuth flow — обязателен параметр `state`
   * (INSTAGRAM_API_REVIEW.md §2). */
  state: string;
}

export interface IntegrationCodeExchangeParams {
  code: string;
  redirectUri: string;
}

export interface IntegrationAccountInsightsParams {
  accessToken: string;
  metrics: string[];
  period: string;
  /** Найдено при реализации Task 3.2 (не было известно на момент Task 3.0):
   * большинство account-level метрик, кроме `reach`, требуют явный
   * `metric_type=total_value` — иначе API отвечает ошибкой. `reach` — по-прежнему
   * работает и без него (легаси time_series поведение). Провайдер передаёт
   * это значение как есть, если оно задано; на вызывающей стороне решать,
   * какой metric_type нужен для конкретных метрик. */
  metricType?: 'total_value' | 'time_series';
}

export interface IntegrationListMediaParams {
  accessToken: string;
  since?: Date;
}

export interface IntegrationMediaInsightsParams {
  accessToken: string;
  mediaId: string;
  mediaType: string;
}

export interface IntegrationProvider {
  readonly platform: IntegrationPlatform;

  /** Строит authorize URL — чистая функция, без сетевого вызова. */
  getAuthorizationUrl(params: IntegrationAuthorizationUrlParams): string;

  /** Server-side обмен `code` на токен. Провайдер сам разбирается с
   * промежуточным short-lived токеном (INSTAGRAM_API_REVIEW.md §2) —
   * наружу отдаёт только финальный (long-lived для Instagram) токен. */
  exchangeCodeForTokens(params: IntegrationCodeExchangeParams): Promise<IntegrationTokens>;

  refreshTokens(tokens: IntegrationTokens): Promise<IntegrationTokens>;

  getAccountInsights(
    params: IntegrationAccountInsightsParams,
  ): Promise<IntegrationInsightsResult>;

  listRecentMedia(params: IntegrationListMediaParams): Promise<IntegrationMediaSummary[]>;

  getMediaInsights(params: IntegrationMediaInsightsParams): Promise<IntegrationInsightsResult>;

  /** Best-effort отзыв доступа на стороне платформы, если у неё есть для
   * этого известный endpoint. Опционален: для Instagram точный endpoint
   * revocation не подтверждён документацией на момент Task 3.0
   * (`INSTAGRAM_API_REVIEW.md` §8, gap 1) — если метод отсутствует,
   * приложение просто перестаёт использовать и хранить токен локально
   * (это Data-layer concern, не Integration-layer). */
  disconnect?(tokens: IntegrationTokens): Promise<void>;
}
