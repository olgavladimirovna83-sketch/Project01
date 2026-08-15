import type { RecommendationWithReasons } from '@/data/repositories';
import type { AIMessage } from './AIProvider';

/**
 * Task 9.1 — Phase 9, первая реальная задача AI Layer (`29_AI_LAYER.md`
 * §34 AI FOR EXPLANATIONS). Структура объяснения — буквально §50 DECISION
 * EXPLANATION (`21_DECISION_LOGIC.md`, НЕ `29_AI_LAYER.md` — уточнение
 * цитаты, номер раздела совпал случайно между документами, содержание в
 * `29_AI_LAYER.md` §50 другое — PROVIDER FAILURE):
 *
 * Recommendation → Why now → Evidence → Expected benefit → Uncertainty.
 *
 * §18 AI CONTEXT/§19 CONTEXT_BUILDER/§20 EVIDENCE-FIRST: в модель уходит
 * только то, что нужно для ЭТОЙ конкретной рекомендации — уже готовые
 * `RecommendationReason` (Task 8.3) и `context.ranking` (Task 8.3/8.4), не
 * вся база. §20 буквально требует конкретный evidence вместо общих слов
 * ("12 comparable videos, 8 above baseline..."), не "Videos work well" —
 * поэтому reasons передаются как есть, не пересказываются.
 *
 * Качественный (не числовой) confidence в промпте — намеренно.
 * `Recommendation.confidence` в БД хранит числовое приближение
 * (`CONFIDENCE_SCORE`, D-0022) шкалы low/medium/high, а не измеренную
 * вероятность. §14 CONFIDENCE прямо предупреждает: "AI confidence не
 * должен автоматически трактоваться как статистическая вероятность
 * истинности" — то же верно и в обратную сторону, отправлять модели голое
 * число 0.5 означало бы приглашение придумать псевдо-статистическую
 * формулировку ("50% вероятность успеха"), которой не существует.
 * Восстанавливается качественная метка кандидата из уже сохранённого
 * `context.ranking` (Task 8.1 `CandidateResult.confidence`, буквально то,
 * что видел scorer), не переводится обратно из числа.
 */

export const DECISION_EXPLANATION_PROMPT_VERSION = 'decision-explanation-v1';

export interface DecisionExplanation {
  whyNow: string;
  evidence: string;
  expectedBenefit: string;
  uncertainty: string;
}

interface StoredRankingEntry {
  candidate?: string;
  confidence?: string;
}

interface StoredContext {
  goal?: { goalType?: string; priority?: number };
  primaryMetric?: string;
  ranking?: StoredRankingEntry[];
}

function readContext(context: unknown): StoredContext {
  return context !== null && typeof context === 'object' ? (context as StoredContext) : {};
}

function candidateConfidenceLabel(context: StoredContext, primaryCandidate: string): string | null {
  const entry = context.ranking?.find((r) => r.candidate === primaryCandidate);
  return entry?.confidence ?? null;
}

const SYSTEM_PROMPT = `You explain an ALREADY-MADE, rule-based content recommendation to the creator who owns it. You do not make or change the recommendation — deterministic code already decided it. Your only job is to explain it clearly, honestly, and specifically, using ONLY the evidence given to you.

Rules:
- Never invent facts, numbers, or evidence that are not in the input. If the input does not mention something, do not claim it.
- Never state more certainty than the given confidence level supports. If confidence is "low", say so plainly — do not write as if it were proven.
- Be specific: refer to the actual format, metric, and evidence given, not generic statements like "this usually works well".
- Output ONLY a single JSON object, no markdown, no code fences, no commentary before or after it, with exactly these four string keys: "whyNow", "evidence", "expectedBenefit", "uncertainty".
- "whyNow": one or two sentences on why this recommendation makes sense right now, given the goal and evidence.
- "evidence": one or two sentences citing the concrete evidence it is based on.
- "expectedBenefit": one sentence on what following it is expected to achieve, without overpromising.
- "uncertainty": one sentence honestly stating the limits of this recommendation (sample size, confidence level, anything not accounted for).`;

export function buildExplanationPrompt(recommendation: RecommendationWithReasons): {
  systemPrompt: string;
  messages: AIMessage[];
} {
  const context = readContext(recommendation.context);
  const confidenceLabel = candidateConfidenceLabel(context, recommendation.primaryCandidate) ?? 'unknown';

  const evidenceLines = recommendation.reasons
    .map((reason) => {
      const confidencePart = reason.confidence !== null ? ` (confidence: ${reason.confidence})` : '';
      return `- [${reason.reasonType}] ${reason.description}${confidencePart}`;
    })
    .join('\n');

  const userMessage = [
    `Recommended format: "${recommendation.primaryCandidate}"`,
    context.primaryMetric ? `Optimizing for metric: "${context.primaryMetric}"` : null,
    context.goal?.goalType
      ? `User's active goal: "${context.goal.goalType}" (priority ${context.goal.priority})`
      : null,
    `Confidence in this comparison: ${confidenceLabel}`,
    `Evidence:\n${evidenceLines || '(no recorded reasons)'}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n\n');

  return {
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  };
}
