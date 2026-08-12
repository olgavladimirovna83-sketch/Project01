import type {
  IntegrationAccountInsightsParams,
  IntegrationAuthorizationUrlParams,
  IntegrationCodeExchangeParams,
  IntegrationInsightsResult,
  IntegrationListMediaParams,
  IntegrationMediaInsightsParams,
  IntegrationMediaSummary,
  IntegrationPlatform,
  IntegrationProvider,
  IntegrationTokens,
} from './IntegrationProvider';

// Registry, а не hardcoded провайдер (в отличие от AIService — там один
// текущий provider). Здесь платформ по продуктовому требованию будет
// больше одной (Instagram сейчас, TikTok и другие позже —
// `08_METRICS_FRAMEWORK.md` §16), и конкретные providers/* ещё не
// реализованы (пишутся отдельным шагом) — регистрация вынесена наружу,
// чтобы IntegrationService не зависел от того, какие провайдеры уже
// существуют.
const registry = new Map<IntegrationPlatform, IntegrationProvider>();

export function registerIntegrationProvider(provider: IntegrationProvider): void {
  registry.set(provider.platform, provider);
}

function getProvider(platform: IntegrationPlatform): IntegrationProvider {
  const provider = registry.get(platform);
  if (!provider) {
    throw new Error(`No integration provider registered for platform "${platform}"`);
  }
  return provider;
}

export const IntegrationService = {
  getAuthorizationUrl(
    platform: IntegrationPlatform,
    params: IntegrationAuthorizationUrlParams,
  ): string {
    return getProvider(platform).getAuthorizationUrl(params);
  },

  exchangeCodeForTokens(
    platform: IntegrationPlatform,
    params: IntegrationCodeExchangeParams,
  ): Promise<IntegrationTokens> {
    return getProvider(platform).exchangeCodeForTokens(params);
  },

  refreshTokens(platform: IntegrationPlatform, tokens: IntegrationTokens): Promise<IntegrationTokens> {
    return getProvider(platform).refreshTokens(tokens);
  },

  getAccountInsights(
    platform: IntegrationPlatform,
    params: IntegrationAccountInsightsParams,
  ): Promise<IntegrationInsightsResult> {
    return getProvider(platform).getAccountInsights(params);
  },

  listRecentMedia(
    platform: IntegrationPlatform,
    params: IntegrationListMediaParams,
  ): Promise<IntegrationMediaSummary[]> {
    return getProvider(platform).listRecentMedia(params);
  },

  getMediaInsights(
    platform: IntegrationPlatform,
    params: IntegrationMediaInsightsParams,
  ): Promise<IntegrationInsightsResult> {
    return getProvider(platform).getMediaInsights(params);
  },

  disconnect(platform: IntegrationPlatform, tokens: IntegrationTokens): Promise<void> {
    const provider = getProvider(platform);
    return provider.disconnect ? provider.disconnect(tokens) : Promise.resolve();
  },
};
