import {
  type IntegrationAccountIdentity,
  type IntegrationAccountInsightsParams,
  IntegrationAuthError,
  type IntegrationAuthorizationUrlParams,
  type IntegrationCodeExchangeParams,
  type IntegrationInsightsResult,
  type IntegrationListMediaParams,
  type IntegrationMediaInsightsParams,
  type IntegrationMediaSummary,
  type IntegrationProvider,
  IntegrationRateLimitError,
  type IntegrationTokens,
} from '../IntegrationProvider';

/**
 * Единственный файл, которому разрешено обращаться к api.instagram.com /
 * graph.instagram.com напрямую (CLAUDE.md §4.1, тот же паттерн, что
 * providers/anthropic.ts и providers/r2.ts). Endpoints и формы ответов —
 * из INSTAGRAM_API_REVIEW.md (Task 3.0) и уточнения по permissions (Task 3.0
 * addendum), не по памяти.
 */

// Версия Graph API вынесена в env — Meta регулярно выпускает новые версии,
// смена не должна требовать правки кода.
const API_VERSION = process.env.INSTAGRAM_API_VERSION ?? 'v25.0';
const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
const CODE_EXCHANGE_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = `https://graph.instagram.com/${API_VERSION}`;
// Обмен на long-lived и refresh — БЕЗ версии в пути (INSTAGRAM_API_REVIEW.md
// §2/§4 документирует их как https://graph.instagram.com/access_token и
// /refresh_access_token, в отличие от версионированных data-endpoints вроде
// /v25.0/me и /v25.0/{id}/insights). Найдено при перепроверке реализации
// после того, как "Session key invalid" воспроизвёлся на заведомо свежем
// токене (Task 3.2) — до этого оба использовали версионированный GRAPH_BASE
// по ошибке.
const LONG_LIVED_EXCHANGE_URL = 'https://graph.instagram.com/access_token';
const REFRESH_TOKEN_URL = 'https://graph.instagram.com/refresh_access_token';

// Подтверждено Olga через реальную авторизацию (TASKS.md, Task 3.0
// addendum): instagram_business_basic + отдельное insights-разрешение.
// Comments/messages/content-publish осознанно не запрашиваются.
//
// Точное каноническое имя scope для insights в Business Login — закрытый
// вопрос (INSTAGRAM_API_REVIEW.md §8, gap 2, закрыто 13 августа 2026):
// реальный OAuth authorize-запрос с этим OAUTH_SCOPE прошёл живую
// проверку через настоящий браузер (Task 3.2/3.4) — консент-экран, code,
// exchangeCodeForTokens отработал чисто, итоговый токен получил рабочий
// доступ к insights endpoints (getAccountInsights подтверждён живыми
// данными аккаунта Olga). Официальная сводная таблица permissions Meta
// по-прежнему называет для этой функции только старый scope
// instagram_manage_insights (Facebook Login-эра) — само имя строки не
// подтверждено дословно документацией, но связка permissions в целом
// подтверждена достаточной на практике, не только предположительно.
const OAUTH_SCOPE = 'instagram_business_basic,instagram_business_manage_insights';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// Task 4.3 — 42_IMPLEMENTATION_ROADMAP.md §24 RETRIES требует timeout
// отдельно от retry: без него зависший запрос блокирует sync неограниченно
// (Node не применяет таймаут к fetch() по умолчанию). Аборт превращается в
// обычный Error (не Auth/RateLimit) — withRetry (src/ingestion/retry.ts)
// трактует его как временный сбой и ретраит.
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Instagram API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
    type?: string;
  };
}

async function parseGraphResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as GraphErrorBody & T;

  if (!response.ok) {
    const errorCode = body.error?.code;
    const message = body.error?.message ?? `Instagram API error (HTTP ${response.status})`;

    // 401/403 — недействительный/отозванный токен, terminal state, не
    // ретраить (INSTAGRAM_API_REVIEW.md §4, §8).
    if (response.status === 401 || response.status === 403) {
      throw new IntegrationAuthError('instagram', message);
    }
    // 80002 — конкретный код rate limit для Instagram Business Use Case
    // (INSTAGRAM_API_REVIEW.md §6); 429 — общий HTTP-эквивалент.
    if (errorCode === 80002 || response.status === 429) {
      throw new IntegrationRateLimitError('instagram', message);
    }
    throw new Error(message);
  }

  return body;
}

function toIntegrationTokens(accessToken: string, expiresInSeconds: number): IntegrationTokens {
  const obtainedAt = new Date();
  return {
    accessToken,
    obtainedAt,
    expiresAt: new Date(obtainedAt.getTime() + expiresInSeconds * 1000),
  };
}

async function fetchAccountIdentity(accessToken: string): Promise<IntegrationAccountIdentity> {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set('fields', 'user_id,username');
  url.searchParams.set('access_token', accessToken);

  const response = await fetchWithTimeout(url);
  const body = await parseGraphResponse<{ user_id: string; username?: string }>(response);
  return { externalUserId: body.user_id, username: body.username };
}

/**
 * Обмен short-lived -> long-lived (grant_type=ig_exchange_token,
 * INSTAGRAM_API_REVIEW.md §2). Вынесен в отдельную экспортируемую функцию —
 * нужна не только как внутренний шаг exchangeCodeForTokens, но и отдельно
 * для диагностики токенов, сгенерированных вручную через Meta App Dashboard
 * ("Generate Token"): заранее неизвестно, short-lived такой токен или уже
 * long-lived (см. TASKS.md, Task 3.2 — вопрос Olga). Если исходный токен уже
 * long-lived, вызов может либо успешно переобменяться (идемпотентно), либо
 * вернуть ошибку — оба исхода информативны и должны быть обработаны
 * вызывающей стороной, не только этой функцией.
 */
export async function exchangeForLongLivedToken(accessToken: string): Promise<IntegrationTokens> {
  const url = new URL(LONG_LIVED_EXCHANGE_URL);
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', requiredEnv('INSTAGRAM_APP_SECRET'));
  url.searchParams.set('access_token', accessToken);

  const response = await fetchWithTimeout(url);
  const body = await parseGraphResponse<{ access_token: string; expires_in: number }>(response);
  return toIntegrationTokens(body.access_token, body.expires_in);
}

// Общий, безопасный для всех media type набор метрик (INSTAGRAM_API_REVIEW.md
// §5) — формат-специфичные метрики (ig_reels_avg_watch_time и т.п.) сюда
// намеренно не включены: точные строковые значения media_type, которые
// реально возвращает API, не подтверждены эмпирически (см. README в
// src/integrations/instagram/), branching по ним сейчас было бы гаданием.
const MEDIA_INSIGHTS_METRICS = [
  'comments',
  'likes',
  'reach',
  'saved',
  'shares',
  'total_interactions',
  'views',
];

export function createInstagramProvider(): IntegrationProvider {
  return {
    platform: 'instagram',

    getAuthorizationUrl(params: IntegrationAuthorizationUrlParams): string {
      const url = new URL(AUTHORIZE_URL);
      url.searchParams.set('client_id', requiredEnv('INSTAGRAM_APP_ID'));
      url.searchParams.set('redirect_uri', params.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', OAUTH_SCOPE);
      url.searchParams.set('state', params.state);
      return url.toString();
    },

    async exchangeCodeForTokens(params: IntegrationCodeExchangeParams): Promise<IntegrationTokens> {
      const body = new URLSearchParams({
        client_id: requiredEnv('INSTAGRAM_APP_ID'),
        client_secret: requiredEnv('INSTAGRAM_APP_SECRET'),
        grant_type: 'authorization_code',
        redirect_uri: params.redirectUri,
        code: params.code,
      });

      const response = await fetchWithTimeout(CODE_EXCHANGE_URL, { method: 'POST', body });
      const shortLived = await parseGraphResponse<{ access_token: string }>(response);

      // Наружу из этого метода отдаётся только финальный long-lived токен
      // (IntegrationProvider contract, Task 3.1).
      return exchangeForLongLivedToken(shortLived.access_token);
    },

    async refreshTokens(tokens: IntegrationTokens): Promise<IntegrationTokens> {
      const url = new URL(REFRESH_TOKEN_URL);
      url.searchParams.set('grant_type', 'ig_refresh_token');
      url.searchParams.set('access_token', tokens.accessToken);

      const response = await fetchWithTimeout(url);
      const body = await parseGraphResponse<{ access_token: string; expires_in: number }>(response);
      return toIntegrationTokens(body.access_token, body.expires_in);
    },

    async getAccountInsights(
      params: IntegrationAccountInsightsParams,
    ): Promise<IntegrationInsightsResult> {
      const { externalUserId } = await fetchAccountIdentity(params.accessToken);

      const url = new URL(`${GRAPH_BASE}/${externalUserId}/insights`);
      url.searchParams.set('metric', params.metrics.join(','));
      url.searchParams.set('period', params.period);
      if (params.metricType) {
        url.searchParams.set('metric_type', params.metricType);
      }
      url.searchParams.set('access_token', params.accessToken);

      const response = await fetchWithTimeout(url);
      const body = await parseGraphResponse<{
        data: Array<{ name: string; period: string; values: Array<{ value: number }> }>;
      }>(response);

      const returnedNames = new Set(body.data.map((entry) => entry.name));

      return {
        metrics: body.data.flatMap((entry) =>
          entry.values.map((value) => ({
            name: entry.name,
            value: value.value,
            period: entry.period,
          })),
        ),
        unavailableMetrics: params.metrics.filter((metric) => !returnedNames.has(metric)),
      };
    },

    async listRecentMedia(params: IntegrationListMediaParams): Promise<IntegrationMediaSummary[]> {
      const { externalUserId } = await fetchAccountIdentity(params.accessToken);

      const url = new URL(`${GRAPH_BASE}/${externalUserId}/media`);
      // media_product_type — найдено при реализации Task 4.1, нужен, чтобы
      // отличить Reels от обычного видео (media_type сам по себе этого не
      // делает). См. комментарий на IntegrationMediaSummary.mediaProductType.
      url.searchParams.set('fields', 'id,media_type,media_product_type,timestamp');
      url.searchParams.set('access_token', params.accessToken);

      const response = await fetchWithTimeout(url);
      const body = await parseGraphResponse<{
        data: Array<{
          id: string;
          media_type: string;
          media_product_type?: string;
          timestamp: string;
        }>;
      }>(response);

      return body.data
        .filter((item) => !params.since || new Date(item.timestamp) >= params.since)
        .map((item) => ({
          externalId: item.id,
          mediaType: item.media_type,
          mediaProductType: item.media_product_type,
          publishedAt: new Date(item.timestamp),
        }));
    },

    async getMediaInsights(
      params: IntegrationMediaInsightsParams,
    ): Promise<IntegrationInsightsResult> {
      const url = new URL(`${GRAPH_BASE}/${params.mediaId}/insights`);
      url.searchParams.set('metric', MEDIA_INSIGHTS_METRICS.join(','));
      url.searchParams.set('access_token', params.accessToken);

      const response = await fetchWithTimeout(url);
      const body = await parseGraphResponse<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>(response);

      const returnedNames = new Set(body.data.map((entry) => entry.name));

      return {
        metrics: body.data.flatMap((entry) =>
          entry.values.map((value) => ({
            name: entry.name,
            value: value.value,
            period: 'lifetime',
          })),
        ),
        unavailableMetrics: MEDIA_INSIGHTS_METRICS.filter((metric) => !returnedNames.has(metric)),
      };
    },

    getAccountIdentity(accessToken: string): Promise<IntegrationAccountIdentity> {
      return fetchAccountIdentity(accessToken);
    },

    // disconnect не реализован — endpoint revocation для Instagram Business
    // Login не подтверждён документацией (INSTAGRAM_API_REVIEW.md §8, gap 1).
    // Опционален в контракте именно для такого случая (IntegrationProvider.ts).
  };
}
