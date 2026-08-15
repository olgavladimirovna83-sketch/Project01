import {
  contentRepository,
  goalRepository,
  patternRepository,
  performanceMetricRepository,
} from '@/data/repositories';
import { CORE_METRICS } from '@/analysis/metricsAnalytics';
import { generateCandidateFormats } from './candidateGenerator';
import { scoreAndRankCandidates, type MetricRanking } from './candidateScorer';
import { determineGoalFit, type GoalFitResult } from './goalFit';

/**
 * Task 8.1 — CANDIDATE_GENERATOR → CANDIDATE_SCORER → RANKING_ENGINE
 * (23_SYSTEM_ARCHITECTURE.md §25–27), полностью на уже сохранённых
 * данных. Task 8.2 — дополнено GOAL_FIRST/GOAL_PRIORITY (21_DECISION_LOGIC.md
 * §6–7): выбирает, какой из уже посчитанных per-metric рейтингов является
 * первичным для целей пользователя (см. goalFit.ts — выбор, не смешивание
 * метрик в одну оценку, прямое следствие D-0024).
 *
 * Сам этот модуль остаётся read-only, как и был в Task 8.1/8.2 —
 * персистентность в `Recommendation` (reasons/context/decision_version,
 * `25_DATABASE_SCHEMA.md` §26/§28/§30) реализована отдельно, поверх этой
 * функции, в `recommendationPersistence.ts` (Task 8.3), не здесь.
 */

async function computeRankings(
  userId: string,
): Promise<{ candidates: string[]; rankings: MetricRanking[] }> {
  const [content, metricRows, patterns] = await Promise.all([
    contentRepository.findByUserId(userId),
    performanceMetricRepository.findRowsByUserId(userId),
    patternRepository.findByUserId(userId),
  ]);

  const candidates = generateCandidateFormats(content);
  if (candidates.length === 0) {
    return { candidates, rankings: CORE_METRICS.map((metric) => ({ metric, ranking: [], pattern: null })) };
  }

  const contentTypeByContentId = new Map(content.map((item) => [item.id, item.contentType]));
  const rowsWithContentType = metricRows
    .filter((row) => contentTypeByContentId.has(row.contentId))
    .map((row) => ({ ...row, contentType: contentTypeByContentId.get(row.contentId) as string }));

  return { candidates, rankings: scoreAndRankCandidates(candidates, rowsWithContentType, patterns) };
}

export interface DecisionCandidatesResult {
  goalFit: GoalFitResult;
  rankings: MetricRanking[];
  /** Ranking, соответствующий метрике, выбранной goal fit — удобный
   * short-cut, чтобы не искать его в `rankings` по имени metric. `null`,
   * если goal fit не смог выбрать метрику (см. `goalFit.reason`). */
  primaryRanking: MetricRanking | null;
}

export async function getDecisionCandidates(userId: string): Promise<DecisionCandidatesResult> {
  const [{ rankings }, goals] = await Promise.all([
    computeRankings(userId),
    goalRepository.findByUserId(userId),
  ]);

  const goalFit = determineGoalFit(goals, CORE_METRICS);
  const primaryRanking = goalFit.primaryMetric
    ? (rankings.find((ranking) => ranking.metric === goalFit.primaryMetric) ?? null)
    : null;

  return { goalFit, rankings, primaryRanking };
}
