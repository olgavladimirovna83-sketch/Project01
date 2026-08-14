/**
 * Task 5.2 — completeness (26_DATA_PIPELINE.md §56 DATA_QUALITY: "complete/
 * partial/suspicious/unavailable"; §57 QUALITY_IMPACT: "если из 20 публикаций
 * у 8 отсутствует ключевая метрика, система не должна вести себя так, будто
 * анализ основан на всех 20"). Использует уже существующее различие
 * value: null для недоступных метрик (Task 4.1, 08_METRICS_FRAMEWORK.md §11)
 * — чистая функция, без сети/БД, юнит-тестируется на синтетических данных
 * (тот же паттерн, что src/ingestion/normalize.ts).
 */

export interface ContentMetricRow {
  contentId: string;
  measuredAt: Date;
  value: number | null;
}

export interface CompletenessResult {
  totalContentWithMetrics: number;
  completeContentCount: number;
  /** null, если ни у одной публикации ещё нет метрик — "полнота" тогда не
   * определена, а не "0%" (не путать "нечего измерить" с "измерили плохо"). */
  completenessRatio: number | null;
}

/**
 * Для каждой публикации берётся ТОЛЬКО последний по времени batch метрик
 * (PerformanceMetric — snapshot-таблица, Task 4.1: повторный sync добавляет
 * новые строки, не перезаписывает). Публикация "complete", если ни у одной
 * метрики в этом последнем batch value не null — то есть ни одна ожидаемая
 * на момент того sync'а метрика не оказалась в unavailableMetrics.
 */
export function computeCompleteness(rows: ContentMetricRow[]): CompletenessResult {
  const byContent = new Map<string, ContentMetricRow[]>();
  for (const row of rows) {
    const existing = byContent.get(row.contentId);
    if (existing) {
      existing.push(row);
    } else {
      byContent.set(row.contentId, [row]);
    }
  }

  let completeContentCount = 0;
  for (const contentRows of byContent.values()) {
    const latestMeasuredAtMs = Math.max(...contentRows.map((r) => r.measuredAt.getTime()));
    const latestBatch = contentRows.filter((r) => r.measuredAt.getTime() === latestMeasuredAtMs);
    if (latestBatch.every((r) => r.value !== null)) {
      completeContentCount += 1;
    }
  }

  const totalContentWithMetrics = byContent.size;
  return {
    totalContentWithMetrics,
    completeContentCount,
    completenessRatio: totalContentWithMetrics > 0 ? completeContentCount / totalContentWithMetrics : null,
  };
}
