import { patternRepository, performanceMetricRepository } from '@/data/repositories';
import { CORE_METRICS } from '@/analysis/metricsAnalytics';
import { latestValuesByContent, type MetricRow } from '@/analysis/metricRows';
import { computeBaseline } from '@/analysis/personalBaseline';
import { CONFIDENCE_SCORE } from './analyticsMemory';

/**
 * Task 7.2 — Pattern Detection, первый шаг (26_DATA_PIPELINE.md §28
 * PATTERN_DETECTION/§29 POSITIVE_PATTERN/§30 NEGATIVE_PATTERN/§31
 * PATTERN_CONFIDENCE). Первое реальное использование `Pattern` (модель
 * существует с Task 1.1, ни разу не использовалась — как и `Memory` до
 * Task 7.1).
 *
 * §28 перечисляет пять видов закономерностей: повторяющиеся сильные
 * результаты, устойчивые слабые результаты, комбинации признаков,
 * изменения поведения, новые emerging patterns. Эта задача реализует
 * только первый и второй пункт — простую частотную закономерность
 * "метрика конкретной публикации систематически выше/ниже личной нормы"
 * — для каждой из трёх основных метрик (`CORE_METRICS`, Task 6.1).
 * Комбинации признаков (нужен `ContentFeature`, не задействован ни одной
 * задачей), изменения поведения во времени и жизненный цикл паттерна
 * (`22_DATA_MODEL.md` §17 PATTERN_STATUS: hypothesis→emerging→confirmed→
 * strong→declining→inactive, §18 PATTERN_DECAY, §19 PATTERN_REACTIVATION)
 * — не входят, следующие шаги Phase 7, не эта задача.
 *
 * Гранулярность — на уровне ОТДЕЛЬНОЙ публикации, не периода: §29 явно
 * говорит "один успешный пост не должен автоматически создавать «это
 * всегда работает»" — про конкретные посты, не про усреднённое значение
 * периода (то была гранулярность Task 6.2 personalBaseline). Каждая
 * публикация сравнивается с personal baseline (Task 6.2, computeBaseline)
 * по тому же относительному порогу, что и остальной код (10%,
 * TREND_CHANGE_THRESHOLD/COMPARISON_CHANGE_THRESHOLD) — согласованность
 * определения "выше/ниже нормы" по всей кодовой базе.
 *
 * Честная оговорка по покрытию `22_DATA_MODEL.md` §15 PATTERN: модель
 * `Pattern` (Task 1.1) не имеет полей "связанные признаки"
 * (ContentFeature) и "связанные цели" (Goal) из документированного
 * списка — оба поля предполагают связи с другими сущностями, которых в
 * Task 1.1 не было (не входили в 10 core entities, D-0008). §16
 * PATTERN_EVIDENCE (Pattern должен знать, какие конкретные публикации
 * сформировали вывод) тоже не реализован формально — тот же класс
 * пробела, что MEMORY_EVIDENCE в Task 7.1/D-0022, тот же временный
 * суррогат: basis описывается текстом в `description`, не связью.
 *
 * Upsert, не snapshot: в отличие от PerformanceMetric/AccountSnapshot/
 * Memory (Task 4.1/4.2/7.1), Pattern — единственная эволюционирующая
 * запись на (userId, patternType), не новая строка на каждый прогон.
 * Это прямо следует из документации: §18 PATTERN_DECAY — "старая
 * информация не удаляется, история сохраняется" внутри ОДНОЙ записи
 * (confidence снижается, не создаётся вторая); §19 PATTERN_REACTIVATION
 * говорит про повторное подтверждение той же закономерности. Каждый
 * повторный прогон при том же выводе обновляет `lastConfirmedAt`, не
 * создаёт вторую строку под ту же metric.
 */

// Заглушки, не измеренные величины — тот же характер, что все пороги
// выборки/относительного изменения в проекте (D-0016/D-0019/D-0020).
const MIN_OBSERVATIONS_FOR_PATTERN = 5;
const ITEM_COMPARISON_THRESHOLD = 0.1;
const MIN_CONSISTENCY_FOR_PATTERN = 0.6;

type ItemComparison = 'above' | 'below' | 'at_baseline';

function compareItemToBaseline(value: number, baselineAverage: number): ItemComparison {
  if (baselineAverage === 0) {
    return value === 0 ? 'at_baseline' : 'above';
  }
  const relativeChange = (value - baselineAverage) / baselineAverage;
  if (relativeChange > ITEM_COMPARISON_THRESHOLD) {
    return 'above';
  }
  if (relativeChange < -ITEM_COMPARISON_THRESHOLD) {
    return 'below';
  }
  return 'at_baseline';
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface DetectedPattern {
  metric: string;
  /** null — недостаточно данных или нет чёткого большинства направления
   * (26_DATA_PIPELINE.md §29 — единичный результат не создаёт паттерн). */
  direction: 'positive' | 'negative' | null;
  observationCount: number;
  matchingCount: number;
  /** Доля публикаций, подтверждающих направление большинства. */
  consistency: number | null;
  /** Средняя относительная величина отклонения от нормы среди
   * подтверждающих публикаций — "сила" (22_DATA_MODEL.md §15). */
  strength: number | null;
  confidence: number | null;
}

export function detectMetricPattern(rows: MetricRow[], metricType: string): DetectedPattern {
  const baseline = computeBaseline(rows, metricType);
  const entries = [...latestValuesByContent(rows, metricType).values()];

  if (baseline.average === null || entries.length < MIN_OBSERVATIONS_FOR_PATTERN) {
    return {
      metric: metricType,
      direction: null,
      observationCount: entries.length,
      matchingCount: 0,
      consistency: null,
      strength: null,
      confidence: null,
    };
  }

  const baselineAverage = baseline.average;
  let aboveCount = 0;
  let belowCount = 0;
  for (const entry of entries) {
    const comparison = compareItemToBaseline(entry.value, baselineAverage);
    if (comparison === 'above') aboveCount += 1;
    if (comparison === 'below') belowCount += 1;
  }

  const observationCount = entries.length;
  const matchingCount = Math.max(aboveCount, belowCount);
  const consistency = matchingCount / observationCount;

  if (consistency < MIN_CONSISTENCY_FOR_PATTERN) {
    return {
      metric: metricType,
      direction: null,
      observationCount,
      matchingCount,
      consistency,
      strength: null,
      confidence: null,
    };
  }

  const direction = aboveCount >= belowCount ? 'positive' : 'negative';
  const relativeDeviations = entries
    .map((entry) => (entry.value - baselineAverage) / (baselineAverage === 0 ? 1 : baselineAverage))
    .filter((deviation) => (direction === 'positive' ? deviation > ITEM_COMPARISON_THRESHOLD : deviation < -ITEM_COMPARISON_THRESHOLD));
  const strength = average(relativeDeviations.map((d) => Math.abs(d)));

  // confidence — переиспользует ту же шкалу объёма выборки, что Task 7.1
  // (CONFIDENCE_SCORE/confidenceFromSampleSize, personalBaseline.ts) —
  // одна шкала на весь Knowledge Layer, не отдельная под каждую задачу.
  const sampleSizeScore =
    observationCount >= 15 ? CONFIDENCE_SCORE.high : observationCount >= 10 ? CONFIDENCE_SCORE.medium : CONFIDENCE_SCORE.low;
  const confidence = consistency * sampleSizeScore;

  return { metric: metricType, direction, observationCount, matchingCount, consistency, strength, confidence };
}

function formatDescription(result: DetectedPattern): string {
  const percent = result.consistency !== null ? Math.round(result.consistency * 100) : 0;
  const directionLabel = result.direction === 'positive' ? 'выше' : 'ниже';
  return (
    `${result.metric}: ${result.matchingCount} из ${result.observationCount} публикаций ` +
    `(${percent}%) ${directionLabel} личной нормы`
  );
}

export interface DetectPatternsResult {
  detected: number;
  skipped: number;
}

export async function detectPatterns(userId: string): Promise<DetectPatternsResult> {
  const [rows, existingPatterns] = await Promise.all([
    performanceMetricRepository.findRowsByUserId(userId),
    patternRepository.findByUserId(userId),
  ]);

  let detected = 0;
  let skipped = 0;

  for (const metric of CORE_METRICS) {
    const result = detectMetricPattern(rows, metric);
    if (result.direction === null) {
      // Найденный ранее Pattern (если есть) намеренно не трогается — decay
      // (22_DATA_MODEL.md §18) не входит в эту задачу, см. комментарий
      // модуля. Не разрушаем существующее знание молча.
      skipped += 1;
      continue;
    }

    const existing = existingPatterns.find((pattern) => pattern.patternType === metric);
    const now = new Date();
    if (existing) {
      await patternRepository.update(existing.id, {
        direction: result.direction,
        strength: result.strength,
        confidence: result.confidence,
        description: formatDescription(result),
        lastConfirmedAt: now,
      });
    } else {
      // Первое обнаружение — тоже подтверждение (§18 PATTERN_DECAY/§19
      // PATTERN_REACTIVATION говорят про "новые данные подтверждают
      // вывод" начиная с самого первого случая, не только повторных).
      await patternRepository.create({
        user: { connect: { id: userId } },
        patternType: metric,
        description: formatDescription(result),
        direction: result.direction,
        strength: result.strength,
        confidence: result.confidence,
        lastConfirmedAt: now,
      });
    }
    detected += 1;
  }

  return { detected, skipped };
}
