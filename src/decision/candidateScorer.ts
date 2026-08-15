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
 * risk, opportunity (нет понятия "experimental candidate"/hypothesis
 * status в текущей реализации — задел на будущее, `DECISIONS.md` D-0027).
 *
 * Task 8.4 добавляет freshness и repetition (обоснование ниже, у обоих
 * своя секция).
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
 *
 * Task 8.4 — FRESHNESS_WEIGHT (`21_DECISION_LOGIC.md` §12): "свежие данные
 * важнее старых" — буквальные пороги документа (0–3 месяца высокий вес,
 * 3–6 средний, 6+ сниженный) применены не к самому расчёту baseline
 * (Task 6.2/D-0019 сознательно НЕ трогается — decay-weighting всей
 * истории остаётся отдельной будущей задачей, см. D-0027), а к тому,
 * насколько свежи данные, СТОЯЩИЕ ЗА конкретным кандидатом — качественная
 * метка (`freshness`), не переоценка среднего числа. §40 NO FALSE
 * PRECISION тот же принцип, что везде: не число, не скрытый вес.
 *
 * REPETITION_CONTROL/RECENCY_OVERRIDE (§13–14) реализованы как ОДИН
 * механизм — оба раздела документа буквально описывают одно и то же
 * поведение на одном и том же примере (пользователь вчера опубликовал
 * carousel — стоит ли снова ставить carousel первым?). Правило дословно
 * по §14: "если пользователь только что использовал формат, система
 * должна проверить, существует ли сейчас более эффективная альтернатива.
 * Если альтернативы нет, тот же формат снова может стать рекомендацией" —
 * это ПРОВЕРКА/пометка, не вычитание веса: топ-кандидат остаётся
 * топ-кандидатом, если нет конкурентной альтернативы; если альтернатива
 * есть — это становится `repetitionNote`, информация для человека
 * (или следующего шага персистентности), не изменение порядка ranking.
 */

/** §12 FRESHNESS_WEIGHT — буквальные пороги документа. `null` — у
 * кандидата вообще нет данных по этой метрике (не отличать от 'stale':
 * "нет данных" ≠ "данные есть, но старые"). */
export type FreshnessLabel = 'recent' | 'aging' | 'stale' | null;

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
  /** Task 8.4, §12 FRESHNESS_WEIGHT — насколько свежи данные, стоящие за
   * этим кандидатом (по самой недавней публикации, вносящей значение в
   * `sampleSize`). */
  freshness: FreshnessLabel;
  /** Task 8.4, §13–14 RECENCY_OVERRIDE/REPETITION_CONTROL — заполняется
   * только на топ-кандидате ranking'а, и только когда он совпадает с
   * форматом, опубликованным последним по времени (по ВСЕМ форматам, не
   * по этой метрике), И существует конкурентная альтернатива (следующий
   * по рангу кандидат не хуже 'at_baseline'). `null` во всех остальных
   * случаях — §14 явно требует НЕ подавлять повтор при отсутствии
   * альтернативы, поэтому "нет пометки" — обычное, ожидаемое состояние,
   * не пробел. */
  repetitionNote: string | null;
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// §12 FRESHNESS_WEIGHT: 0–3 месяца / 3–6 месяцев / 6+ месяцев. "Месяц" не
// определён доком численно — 30 дней, то же грубое приближение, что уже
// использовал anomalyDetection.ts (Task 5.2) для похожих интервалов.
const FRESHNESS_RECENT_MAX_MS = 90 * MS_PER_DAY;
const FRESHNESS_AGING_MAX_MS = 180 * MS_PER_DAY;

function computeFreshness(mostRecentPublishedAt: Date | null, now: Date): FreshnessLabel {
  if (mostRecentPublishedAt === null) {
    return null;
  }
  const ageMs = now.getTime() - mostRecentPublishedAt.getTime();
  if (ageMs <= FRESHNESS_RECENT_MAX_MS) return 'recent';
  if (ageMs <= FRESHNESS_AGING_MAX_MS) return 'aging';
  return 'stale';
}

// §14 REPETITION_CONTROL — "существует ли более эффективная альтернатива"
// прочитано как: следующий по рангу кандидат сравнивается не хуже
// 'at_baseline' (не 'below'/'insufficient_data') — конкурентная
// альтернатива, а не просто "что угодно на втором месте".
function competitiveAlternative(runnerUp: CandidateResult | undefined): string | null {
  if (!runnerUp) return null;
  const isCompetitive = runnerUp.comparison === 'above' || runnerUp.comparison === 'at_baseline';
  return isCompetitive ? runnerUp.candidate : null;
}

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
  // Task 8.4 — §13–14, факт о публикационном поведении пользователя (не
  // per-metric). `null`, если нет опубликованного контента вообще.
  mostRecentContentType: string | null = null,
  now: Date = new Date(),
): MetricRanking[] {
  return CORE_METRICS.map((metric) => {
    // Личная норма — глобальная, по ВСЕМ форматам разом (Task 6.2, D-0019,
    // сознательно не меняется здесь).
    const baseline = computeBaseline(rows, metric);
    const pattern = patterns.find((p) => p.patternType === metric) ?? null;

    const ranking = candidates
      .map((candidate) => {
        const candidateRows = rows.filter((row) => row.contentType === candidate);
        const entries = [...latestValuesByContent(candidateRows, metric).values()];
        const values = entries.map((e) => e.value);
        const candidateAverage = average(values);
        const { comparison, confidence } = compareToBaseline(candidateAverage, values.length, baseline);
        const matchesPattern = computeMatchesPattern(comparison, pattern);
        const mostRecentPublishedAt =
          entries.length === 0
            ? null
            : entries.reduce((max, e) => (e.publishedAt.getTime() > max.getTime() ? e.publishedAt : max), entries[0].publishedAt);

        return {
          candidate,
          comparison,
          confidence,
          sampleSize: values.length,
          label: formatLabel(comparison, confidence, matchesPattern),
          matchesPattern,
          freshness: computeFreshness(mostRecentPublishedAt, now),
          repetitionNote: null as string | null,
        };
      })
      .sort(
        (a, b) =>
          COMPARISON_RANK[a.comparison] - COMPARISON_RANK[b.comparison] ||
          CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence],
      );

    // §13–14 — только топ-кандидат может нести repetitionNote, и только
    // когда он и есть последний опубликованный формат (по всем форматам).
    if (ranking.length > 0 && ranking[0].candidate === mostRecentContentType) {
      const alternative = competitiveAlternative(ranking[1]);
      if (alternative !== null) {
        ranking[0] = {
          ...ranking[0],
          repetitionNote: `recently used — "${alternative}" is a competitive alternative that has not been used as recently`,
        };
      }
    }

    return { metric, ranking, pattern };
  });
}
