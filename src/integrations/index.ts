export { IntegrationService, registerIntegrationProvider } from './IntegrationService';
export {
  IntegrationAuthError,
  IntegrationRateLimitError,
  isTokenExpired,
} from './IntegrationProvider';
export type {
  IntegrationAccountIdentity,
  IntegrationAccountInsightsParams,
  IntegrationAuthorizationUrlParams,
  IntegrationCodeExchangeParams,
  IntegrationInsightsMetric,
  IntegrationInsightsResult,
  IntegrationListMediaParams,
  IntegrationMediaInsightsParams,
  IntegrationMediaSummary,
  IntegrationPlatform,
  IntegrationProvider,
  IntegrationTokens,
} from './IntegrationProvider';

// Провайдерские адаптеры (providers/*) намеренно не реэкспортируются здесь —
// domain-код обращается только к IntegrationService, никогда к конкретному
// провайдеру или платформенному HTTP-клиенту напрямую (CLAUDE.md §4.1).
