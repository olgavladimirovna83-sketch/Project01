import type { ContentSuggestion } from './contentSuggestionPrompt';

/**
 * Task 9.4 — 29_AI_LAYER.md §26 AI OUTPUT VALIDATION, тот же принцип, что
 * `decisionExplanationValidation.ts`: структурная проверка (непустой
 * массив, каждый элемент — непустые text/basedOn), не проверка честности
 * содержания (реально ли текст основан на названном приёме) — та же
 * граница ответственности, что в Task 9.1 (промпт vs валидация).
 */

function stripCodeFence(rawText: string): string {
  const trimmed = rawText.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : trimmed;
}

export function parseContentSuggestions(rawText: string): ContentSuggestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const suggestions = (parsed as Record<string, unknown>).suggestions;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return null;
  }

  const result: ContentSuggestion[] = [];
  for (const item of suggestions) {
    if (item === null || typeof item !== 'object') {
      return null;
    }
    const { text, basedOn } = item as Record<string, unknown>;
    if (typeof text !== 'string' || text.trim().length === 0) {
      return null;
    }
    if (typeof basedOn !== 'string' || basedOn.trim().length === 0) {
      return null;
    }
    result.push({ text: text.trim(), basedOn: basedOn.trim() });
  }

  return result;
}
