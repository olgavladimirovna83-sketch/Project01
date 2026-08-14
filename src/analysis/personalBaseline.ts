import { average, latestValuesByContent, type MetricRow } from './metricRows';

/**
 * Task 6.2 — Phase 6, Analytics Foundation. Personal baseline
 * (22_DATA_MODEL.md §13 PERSONAL_BASELINE — "для каждого пользователя
 * система формирует персональную норму... для reach/likes/saves/
 * followers", §14 BASELINE_VERSION — baseline должен иметь версию/дату
 * расчёта) + сравнение периода Task 6.1 с этой нормой, с confidence на
 * основе объёма выборки.
 *
 * Scope-сужение, найденное при формулировке: `25_DATABASE_SCHEMA.md` §16
 * BASELINES описывает персистентную сущность с `scope`
 * (global/format/topic/goal/комбинация) и §17 BASELINE_HISTORY требует не
 * уничтожать предыдущие версии при пересчёте. Olga явно попросила
 * «простой personal baseline... полностью на уже сохранённых данных» —
 * реализовано как **вычисляемое на лету** значение (тот же принцип, что
 * Task 6.1 — ничего не персистится), только `scope: global` (среднее по
 * всем публикациям пользователя, без сегментации по формату/теме/цели).
 * Полноценная персистентная `Baseline`-сущность с историей версий — более
 * крупный шаг (новая Prisma-модель, миграция, семантика non-global scope),
 * кандидат на будущую задачу, не эта. См. `DECISIONS.md` D-0019.
 *
 * `calculatedAt` (§14 BASELINE_VERSION — "версия или дата расчёта") —
 * присутствует в результате как `Date.now()` на момент вызова, раз
 * baseline не персистится (нет отдельной версии, только «когда посчитан
 * этот конкретный ответ»).
 *
 * Чистые функции — за вход берут те же `MetricRow[]`, что Task 6.1, без
 * сети/БД, юнит-тестируются на синтетических данных.
 */

export type Confidence = 'low' | 'medium' | 'high';

// Пороги объёма выборки для confidence — заглушки, не измеренные величины
// (тот же характер, что TREND_CHANGE_THRESHOLD в metricsAnalytics.ts,
// ANOMALY_RATIO_THRESHOLD в anomalyDetection.ts, D-0016). Прямое требование
// Olga: "мало публикаций — низкий confidence, не выдавай уверенный вывод
// на 2-3 постах" — < 5 сознательно ниже её порога "2-3", с запасом.
const CONFIDENCE_LOW_MAX = 5; // < 5 публикаций → low
const CONFIDENCE_MEDIUM_MAX = 15; // 5–14 → medium, 15+ → high

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

export function confidenceFromSampleSize(sampleSize: number): Confidence {
  if (sampleSize < CONFIDENCE_LOW_MAX) {
    return 'low';
  }
  if (sampleSize < CONFIDENCE_MEDIUM_MAX) {
    return 'medium';
  }
  return 'high';
}

/** Слабейшее из двух звеньев определяет итоговый confidence — сравнение
 * ненадёжно, если ненадёжна ЛИБО норма (baseline), ЛИБО сам период,
 * который с ней сравнивается, даже если другое звено надёжно. */
function weakerConfidence(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

export interface PersonalBaseline {
  metric: string;
  /** null, если у пользователя вообще нет ни одной публикации с этой
   * метрикой — "нормы" не существует, не 0. */
  average: number | null;
  sampleSize: number;
  confidence: Confidence;
  calculatedAt: Date;
}

/** Baseline — среднее по ВСЕМ сохранённым публикациям пользователя,
 * без ограничения периодом (в отличие от summarizeMetric, Task 6.1).
 * Использует ту же "последнее известное значение на публикацию" логику. */
export function computeBaseline(
  rows: MetricRow[],
  metricType: string,
  now: Date = new Date(),
): PersonalBaseline {
  const values = [...latestValuesByContent(rows, metricType).values()].map((e) => e.value);
  return {
    metric: metricType,
    average: average(values),
    sampleSize: values.length,
    confidence: confidenceFromSampleSize(values.length),
    calculatedAt: now,
  };
}

export type BaselineComparison = 'above' | 'below' | 'at_baseline' | 'insufficient_data';

// Тот же относительный порог, что тренд в metricsAnalytics.ts —
// согласованность между "тренд" и "сравнение с нормой" в одном выводе.
const COMPARISON_CHANGE_THRESHOLD = 0.1;

export interface BaselineComparisonResult {
  baseline: PersonalBaseline;
  comparison: BaselineComparison;
  /** min(confidence baseline, confidence текущего периода) — см.
   * weakerConfidence: ни один участник сравнения не должен быть слабым. */
  confidence: Confidence;
}

export function compareToBaseline(
  periodAverage: number | null,
  periodSampleSize: number,
  baseline: PersonalBaseline,
): BaselineComparisonResult {
  const periodConfidence = confidenceFromSampleSize(periodSampleSize);
  const confidence = weakerConfidence(baseline.confidence, periodConfidence);

  if (periodAverage === null || baseline.average === null) {
    return { baseline, comparison: 'insufficient_data', confidence };
  }
  if (baseline.average === 0) {
    return {
      baseline,
      comparison: periodAverage === 0 ? 'at_baseline' : 'above',
      confidence,
    };
  }

  const relativeChange = (periodAverage - baseline.average) / baseline.average;
  if (relativeChange > COMPARISON_CHANGE_THRESHOLD) {
    return { baseline, comparison: 'above', confidence };
  }
  if (relativeChange < -COMPARISON_CHANGE_THRESHOLD) {
    return { baseline, comparison: 'below', confidence };
  }
  return { baseline, comparison: 'at_baseline', confidence };
}
