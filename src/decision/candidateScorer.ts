import type { Pattern } from '@prisma/client';
import { average, latestValuesByContent, type MetricRow } from '@/analysis/metricRows';
import { CORE_METRICS } from '@/analysis/metricsAnalytics';
import {
  compareToBaseline,
  computeBaseline,
  type BaselineComparison,
  type Confidence,
} from '@/analysis/personalBaseline';

/**
 * Task 8.1 — CANDIDATE_SCORER (23_SYSTEM_ARCHITECTURE.md §26) + RANKING_ENGINE
 * (§27) / 21_DECISION_LOGIC.md §39 DECISION_SCORE/§40 NO FALSE PRECISION/
 * §41 RANKING. Не полная формула из 9 факторов CANDIDATE_SCORER (goal fit/
 * recent performance/historical performance/pattern strength/confidence/
 * freshness/repetition/risk/opportunity, 23_SYSTEM_ARCHITECTURE.md §26) —
 * честно только то, для чего реально есть расчёт сейчас:
 *
 * - historical performance — личная норма (Task 6.2, computeBaseline,
 *   scope: global, D-0019) как единственный якорь сравнения;
 * - сравнение производительности конкретного КАНДИДАТА (формата) с этой
 *   нормой — новое здесь: Task 6.2/7.2 считали всё по метрике В ЦЕЛОМ
 *   (все форматы вместе), не по формату отдельно. Личная норма остаётся
 *   глобальной (как и решено в D-0019), но то, ЧТО с ней сравнивается —
 *   теперь среднее по конкретному формату, не по периоду;
 * - confidence — переиспользует `compareToBaseline` (Task 6.2) без
 *   изменений: минимум из confidence нормы и confidence выборки кандидата;
 * - pattern strength/direction — только если существует Pattern (Task 7.2)
 *   для этой метрики. Честная оговорка: Pattern (Task 7.2) — тоже
 *   глобальный (по метрике, не по формату), не про конкретный кандидат.
 *   Используется только как контекстная пометка ("это часть уже
 *   подтверждённой закономерности"), не как отдельный вклад в ранжирование
 *   между кандидатами — было бы нечестно: один и тот же глобальный Pattern
 *   не может обосновывать, почему один формат лучше другого.
 *
 * НЕ реализовано здесь (нет расчёта в этом модуле): goal fit — реализован
 * отдельно, как слой ВЫБОРА поверх уже посчитанных per-metric рейтингов
 * (`goalFit.ts`, Task 8.2, D-0025), не как фактор внутри самого scorer'а;
 * freshness (нет decay-логики), repetition (Task 8.3 начала заполнять
 * `Recommendation`, но сам scorer по-прежнему не читает историю
 * рекомендаций — задел на будущее, не реализовано сейчас), risk,
 * opportunity.
 *
 * Ranking — раздельно ПО КАЖДОЙ метрике (reach/likes/saved), не единый
 * список кандидатов across all metrics. Без goal fit (единственного
 * фактора, который в документе как раз и решает, какая метрика важнее)
 * нечестно было бы схлопывать три метрики в одну оценку — это само по
 * себе стало бы skрытым false precision (§40): придуманным весом,
 * которого не существует.
 *
 * §40 NO FALSE PRECISION — результат качественный (`label`, например
 * "above baseline, high confidence"), не число вроде "87.42".
 *
 * Task 8.3: `CandidateResult.matchesPattern`/`MetricRanking.pattern`
 * добавлены как структурные поля (раньше совпадение с паттерном было видно
 * только текстом внутри `label`) — нужны `recommendationPersistence.ts`,
 * чтобы завести отдельную RECOMMENDATION_REASON('pattern'), не парся
 * качественный текст.
 */

export interface CandidateResult {
  candidate: string;
  comparison: BaselineComparison;
  confidence: Confidence;
  sampleSize: number;
  label: string;
  /** Совпадает ли направление кандидата с направлением уже подтверждённого
   * паттерна для этой метрики (см. `formatLabel`) — структурный флаг,
   * дублирующий то, что уже видно текстом в `label`. Экспортирован явно
   * (Task 8.3), чтобы персистентность (`recommendationPersistence.ts`)
   * могла создать отдельную RECOMMENDATION_REASON('pattern'), не
   * распарсивая качественный текст `label`. */
  matchesPattern: boolean;
}

export interface MetricRanking {
  metric: string;
  ranking: CandidateResult[];
  /** Pattern (Task 7.2), использованный для сравнения направления при
   * формировании `matchesPattern` — null, если для этой метрики нет
   * подтверждённого паттерна. Per-metric, не per-candidate (Pattern
   * глобален по метрике, D-0024/candidateScorer header). Возвращается
   * здесь (Task 8.3), чтобы персистентность не делала повторный запрос
   * за тем же Pattern. */
  pattern: Pattern | null;
}

const COMPARISON_RANK: Record<BaselineComparison, number> = {
  above: 0,
  at_baseline: 1,
  below: 2,
  insufficient_data: 3,
};

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

// Пометка о паттерне ставится, только если направление кандидата совпадает
// с направлением уже подтверждённого паттерна — "at_baseline" не совпадает
// ни с positive, ни с negative, пометки не будет.
function computeMatchesPattern(comparison: BaselineComparison, pattern: Pattern | null): boolean {
  return (
    pattern !== null &&
    ((comparison === 'above' && pattern.direction === 'positive') ||
      (comparison === 'below' && pattern.direction === 'negative'))
  );
}

function formatLabel(comparison: BaselineComparison, confidence: Confidence, matchesPattern: boolean): string {
  if (comparison === 'insufficient_data') {
    return 'insufficient data';
  }
  const comparisonLabel =
    comparison === 'above' ? 'above baseline' : comparison === 'below' ? 'below baseline' : 'at baseline';
  const patternNote = matchesPattern ? ', part of an already confirmed pattern for this metric' : '';
  return `${comparisonLabel}, ${confidence} confidence${patternNote}`;
}

export function scoreAndRankCandidates(
  candidates: string[],
  rows: Array<MetricRow & { contentType: string }>,
  patterns: Pattern[],
): MetricRanking[] {
  return CORE_METRICS.map((metric) => {
    // Личная норма — глобальная, по ВСЕМ форматам разом (Task 6.2, D-0019,
    // сознательно не меняется здесь).
    const baseline = computeBaseline(rows, metric);
    const pattern = patterns.find((p) => p.patternType === metric) ?? null;

    const ranking = candidates
      .map((candidate) => {
        const candidateRows = rows.filter((row) => row.contentType === candidate);
        const values = [...latestValuesByContent(candidateRows, metric).values()].map((v) => v.value);
        const candidateAverage = average(values);
        const { comparison, confidence } = compareToBaseline(candidateAverage, values.length, baseline);
        const matchesPattern = computeMatchesPattern(comparison, pattern);

        return {
          candidate,
          comparison,
          confidence,
          sampleSize: values.length,
          label: formatLabel(comparison, confidence, matchesPattern),
          matchesPattern,
        };
      })
      .sort(
        (a, b) =>
          COMPARISON_RANK[a.comparison] - COMPARISON_RANK[b.comparison] ||
          CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence],
      );

    return { metric, ranking, pattern };
  });
}
