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
