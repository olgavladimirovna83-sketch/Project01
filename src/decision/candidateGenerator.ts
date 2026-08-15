/**
 * Task 8.1 — Phase 8, Recommendation Engine, CANDIDATE_GENERATOR
 * (23_SYSTEM_ARCHITECTURE.md §25: "создаёт возможные варианты... video/
 * carousel/photo/strong known format/experimental format"; 21_DECISION_LOGIC.md
 * §9 CANDIDATE_GENERATION — тот же список примеров).
 *
 * Список кандидатов НЕ захардкожен — берётся из реально существующих у
 * пользователя `Content.contentType`, не из универсального списка всех
 * теоретически возможных форматов Instagram. Тот же принцип "ничего не
 * предполагать заранее", что применялся с самого начала проекта (см.
 * D-0018 — CORE_METRICS ограничен тем, что реально собирается, не полным
 * документированным списком; тот же ход мысли здесь, для форматов).
 */

export function generateCandidateFormats(content: Array<{ contentType: string }>): string[] {
  return [...new Set(content.map((item) => item.contentType))];
}

/**
 * Task 8.4 — REPETITION_CONTROL/RECENCY_OVERRIDE (`21_DECISION_LOGIC.md`
 * §13–14): "если пользователь только что использовал определённый
 * формат" — какой формат был опубликован последним по времени, по всем
 * форматам разом (не per-metric — это факт о поведении публикации, не о
 * производительности). `null`, если публикаций нет вовсе, либо ни у
 * одной нет `publishedAt` (ещё не заполнен ingestion'ом).
 */
export function mostRecentContentType(
  content: Array<{ contentType: string; publishedAt: Date | null }>,
): string | null {
  let latest: { contentType: string; publishedAt: Date } | null = null;
  for (const item of content) {
    if (item.publishedAt === null) continue;
    if (latest === null || item.publishedAt.getTime() > latest.publishedAt.getTime()) {
      latest = { contentType: item.contentType, publishedAt: item.publishedAt };
    }
  }
  return latest?.contentType ?? null;
}
