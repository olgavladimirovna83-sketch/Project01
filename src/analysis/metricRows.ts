/**
 * Общие для metricsAnalytics.ts (Task 6.1) и personalBaseline.ts (Task 6.2)
 * тип строки и хелперы — вынесены в отдельный модуль, чтобы избежать
 * циклического импорта между ними (оба нужны друг другу: baseline
 * переиспользует "последнее значение на публикацию", summarizeMetric
 * вызывает computeBaseline).
 */

export interface MetricRow {
  contentId: string;
  metricType: string;
  value: number | null;
  measuredAt: Date;
  publishedAt: Date | null;
}

/** Публикация → последнее известное (по measuredAt) значение конкретной
 * метрики. PerformanceMetric — snapshot-таблица (Task 4.1/4.2/§19
 * SNAPSHOT_PRINCIPLE), берём самый свежий снимок на публикацию, не сумму
 * по всем историческим снимкам — тот же принцип, что computeCompleteness
 * (Task 5.2). */
export function latestValuesByContent(
  rows: MetricRow[],
  metricType: string,
): Map<string, { value: number; publishedAt: Date }> {
  const latestRowByContent = new Map<string, MetricRow>();
  for (const row of rows) {
    if (row.metricType !== metricType || row.value === null || row.publishedAt === null) {
      continue;
    }
    const existing = latestRowByContent.get(row.contentId);
    if (!existing || row.measuredAt.getTime() > existing.measuredAt.getTime()) {
      latestRowByContent.set(row.contentId, row);
    }
  }

  const result = new Map<string, { value: number; publishedAt: Date }>();
  for (const [contentId, row] of latestRowByContent) {
    result.set(contentId, { value: row.value as number, publishedAt: row.publishedAt as Date });
  }
  return result;
}

/** null, если значений нет вовсе — не путать с 0 (26_DATA_PIPELINE.md §21
 * MISSING_DATA, тот же принцип). */
export function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
