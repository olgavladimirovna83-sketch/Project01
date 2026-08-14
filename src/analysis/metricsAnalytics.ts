/**
 * Task 6.1 — Phase 6, Analytics Foundation (42_IMPLEMENTATION_ROADMAP.md
 * §31 PHASE 6/§33 ANALYTICS_OUTPUT: reproducible, testable, независимая от
 * AI аналитика на определённых формулах — "если показатель можно надёжно
 * вычислить обычным кодом, он должен вычисляться обычным кодом" (§32).
 * Первая содержательная реализация ANALYSIS layer (`src/analysis/`,
 * 24_TECHNICAL_ARCHITECTURE.md §25–29) — до этой задачи папка была только
 * README-заготовкой с Task 0.2.
 *
 * Основные показатели — reach/likes/saves/followers_gained
 * (22_DATA_MODEL.md §10 CONTENT_PERFORMANCE). Найдено при формулировке:
 * `followers_gained` нигде не собирается — ни на уровне публикации (в
 * принципе бессмысленно, это account-level метрика), ни на уровне
 * аккаунта (`syncInstagramAccount` запрашивает `getAccountInsights`
 * только с `metrics: ['reach']`, Task 4.1). Это реальный пробел в
 * ingestion, не в этой задаче — Task 6.1 сознательно ограничена тремя
 * метриками, которые реально есть в БД: `reach`/`likes`/`saved`
 * (Instagram API называет её `saved`, не `saves` — см. MEDIA_INSIGHTS_METRICS
 * в providers/instagram.ts; PerformanceMetric.metricType хранит именно
 * `saved`). Добавление `followers_gained` в сбор данных — кандидат на
 * будущую задачу Phase 4 (Ingestion), не Task 6.1.
 *
 * Чистые функции, без сети/БД — юнит-тестируются на синтетических данных
 * (тот же паттерн, что completeness.ts/anomalyDetection.ts, Task 5.2).
 */

// followers_gained сознательно исключена — не собирается (см. комментарий
// модуля). Список пересмотреть, когда ingestion начнёт её собирать.
export const CORE_METRICS = ['reach', 'likes', 'saved'] as const;
export type CoreMetric = (typeof CORE_METRICS)[number];

export interface MetricRow {
  contentId: string;
  metricType: string;
  value: number | null;
  measuredAt: Date;
  publishedAt: Date | null;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
}

export type Trend = 'up' | 'down' | 'stable' | 'insufficient_data';

// Относительный порог для тренда — тот же принцип, что
// ANOMALY_RATIO_THRESHOLD в anomalyDetection.ts (Task 5.2, D-0016):
// сравнение со своей же историей, не абсолютное число. 10% — заглушка,
// не измеренная величина, подлежит пересмотру на реальных данных.
const TREND_CHANGE_THRESHOLD = 0.1;

export interface MetricSummary {
  metric: string;
  period: AnalyticsPeriod;
  /** Число публикаций, вошедших в расчёт (после отбора "последнее известное
   * значение на публикацию", не число строк PerformanceMetric). */
  sampleSize: number;
  sum: number;
  /** null, если ни одной публикации с этой метрикой не найдено в периоде —
   * не путать с 0 (26_DATA_PIPELINE.md §21 MISSING_DATA "0 vs unavailable",
   * тот же принцип). */
  average: number | null;
  trend: Trend;
}

/** Публикация → последнее известное (по measuredAt) значение конкретной
 * метрики. PerformanceMetric — snapshot-таблица (Task 4.1/4.2/§19
 * SNAPSHOT_PRINCIPLE), берём самый свежий снимок на публикацию, не сумму
 * по всем историческим снимкам — тот же принцип, что computeCompleteness
 * (Task 5.2). */
function latestValuesByContent(
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

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Тренд — публикации периода делятся хронологически (по publishedAt) на
 * две равные половины, средние значения метрики сравниваются между собой.
 * Простое, проверяемое определение (прямое требование Olga — "просто,
 * проверяемо"), не регрессия/наклон.
 */
function computeTrend(entries: Array<{ value: number; publishedAt: Date }>): Trend {
  if (entries.length < 2) {
    return 'insufficient_data';
  }
  const sorted = [...entries].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAverage = average(firstHalf.map((e) => e.value));
  const secondAverage = average(secondHalf.map((e) => e.value));
  if (firstAverage === null || secondAverage === null) {
    return 'insufficient_data';
  }
  if (firstAverage === 0) {
    return secondAverage === 0 ? 'stable' : 'up';
  }

  const relativeChange = (secondAverage - firstAverage) / firstAverage;
  if (relativeChange > TREND_CHANGE_THRESHOLD) {
    return 'up';
  }
  if (relativeChange < -TREND_CHANGE_THRESHOLD) {
    return 'down';
  }
  return 'stable';
}

export function summarizeMetric(
  rows: MetricRow[],
  metricType: string,
  period: AnalyticsPeriod,
): MetricSummary {
  const latestByContent = latestValuesByContent(rows, metricType);

  const inPeriod = [...latestByContent.values()].filter(
    (entry) => entry.publishedAt.getTime() >= period.start.getTime() &&
      entry.publishedAt.getTime() <= period.end.getTime(),
  );

  const values = inPeriod.map((entry) => entry.value);
  const sum = values.reduce((total, v) => total + v, 0);

  return {
    metric: metricType,
    period,
    sampleSize: inPeriod.length,
    sum,
    average: average(values),
    trend: computeTrend(inPeriod),
  };
}

/** Все три собираемых основных показателя разом — структурный результат
 * по каждому (42_IMPLEMENTATION_ROADMAP.md §33 ANALYTICS_OUTPUT: metric/
 * period/value/trend). */
export function computeMetricsAnalytics(
  rows: MetricRow[],
  period: AnalyticsPeriod,
): MetricSummary[] {
  return CORE_METRICS.map((metric) => summarizeMetric(rows, metric, period));
}
