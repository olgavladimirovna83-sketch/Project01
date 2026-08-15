import type { DecisionExplanation } from './decisionExplanationPrompt';

/**
 * Task 9.1 — 29_AI_LAYER.md §26 AI OUTPUT VALIDATION: "AI output должен
 * проходить validation до попадания в database или business logic" —
 * schema/required fields/data types проверяются здесь, до
 * `aiRunRepository.create`. Не пытается проверить СОДЕРЖАНИЕ (честность
 * формулировок §35 EXPLANATION MUST NOT INVENT) — это ответственность
 * промпта (`decisionExplanationPrompt.ts`), автоматическая семантическая
 * проверка текста вне scope этого шага.
 */

const REQUIRED_FIELDS: Array<keyof DecisionExplanation> = [
  'whyNow',
  'evidence',
  'expectedBenefit',
  'uncertainty',
];

// Модели иногда оборачивают JSON в ```json ... ``` несмотря на прямую
// инструкцию не делать этого — снимается один слой code fence, не более.
function stripCodeFence(rawText: string): string {
  const trimmed = rawText.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : trimmed;
}

export function parseExplanation(rawText: string): DecisionExplanation | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    const value = record[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }
  }

  return {
    whyNow: (record.whyNow as string).trim(),
    evidence: (record.evidence as string).trim(),
    expectedBenefit: (record.expectedBenefit as string).trim(),
    uncertainty: (record.uncertainty as string).trim(),
  };
}
