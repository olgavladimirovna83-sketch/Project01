import { contentRepository, patternRepository, performanceMetricRepository } from '@/data/repositories';
import { CORE_METRICS } from '@/analysis/metricsAnalytics';
import { generateCandidateFormats } from './candidateGenerator';
import { scoreAndRankCandidates, type MetricRanking } from './candidateScorer';

/**
 * Task 8.1 — тонкая оркестрация: CANDIDATE_GENERATOR → CANDIDATE_SCORER →
 * RANKING_ENGINE (23_SYSTEM_ARCHITECTURE.md §25–27), полностью на уже
 * сохранённых данных. НЕ пишет в `Recommendation` — это следующий шаг,
 * которому нужны reasons/context/decision_version
 * (`25_DATABASE_SCHEMA.md` §26 RECOMMENDATIONS/§28 RECOMMENDATION_REASONS/
 * §30 RECOMMENDATION_CONTEXT — не §36, см. уточнение в TASKS.md/DECISIONS.md).
 */

export async function getRankedCandidates(userId: string): Promise<MetricRanking[]> {
  const [content, metricRows, patterns] = await Promise.all([
    contentRepository.findByUserId(userId),
    performanceMetricRepository.findRowsByUserId(userId),
    patternRepository.findByUserId(userId),
  ]);

  const candidates = generateCandidateFormats(content);
  if (candidates.length === 0) {
    return CORE_METRICS.map((metric) => ({ metric, ranking: [] }));
  }

  const contentTypeByContentId = new Map(content.map((item) => [item.id, item.contentType]));
  const rowsWithContentType = metricRows
    .filter((row) => contentTypeByContentId.has(row.contentId))
    .map((row) => ({ ...row, contentType: contentTypeByContentId.get(row.contentId) as string }));

  return scoreAndRankCandidates(candidates, rowsWithContentType, patterns);
}
