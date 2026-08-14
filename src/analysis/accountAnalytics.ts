import { externalAccountRepository, performanceMetricRepository } from '@/data/repositories';
import { computeMetricsAnalytics, type AnalyticsPeriod, type MetricSummary } from './metricsAnalytics';

/**
 * Task 6.1 — тонкая оркестрация поверх metricsAnalytics.ts (чистая логика)
 * и уже существующего performanceMetricRepository.findRowsByExternalAccountId
 * (Task 5.2/5.3, теперь дополнен metricType). Полностью на уже сохранённых
 * данных — ни одного обращения к Instagram API.
 */

export interface AccountAnalytics {
  externalAccountId: string;
  platform: string;
  period: AnalyticsPeriod;
  metrics: MetricSummary[];
}

export async function getUserAnalytics(
  userId: string,
  period: AnalyticsPeriod,
): Promise<AccountAnalytics[]> {
  const accounts = await externalAccountRepository.findByUserId(userId);

  return Promise.all(
    accounts.map(async (account) => {
      const rows = await performanceMetricRepository.findRowsByExternalAccountId(account.id);
      return {
        externalAccountId: account.id,
        platform: account.platform,
        period,
        metrics: computeMetricsAnalytics(rows, period),
      };
    }),
  );
}
