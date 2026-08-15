import type { ContentKnowledge } from '@prisma/client';
import type { AIMessage } from './AIProvider';

/**
 * Task 9.4 — Phase 9, AI Layer. Вторая реальная AI-задача, зеркально
 * Task 9.1: генерирует конкретные варианты текста (хуки/заголовки) для
 * темы контента, используя ТОЛЬКО приёмы, реально загруженные в
 * `ContentKnowledge` (Task 9.3) — не общие знания модели о копирайтинге.
 * Тот же принцип §20 EVIDENCE-FIRST/§16 AI HALLUCINATION CONTROL, что
 * `decisionExplanationPrompt.ts`: конкретные данные передаются модели, а
 * не пересказываются в общих словах, и модель явно ограничена ими.
 */

export const CONTENT_SUGGESTION_PROMPT_VERSION = 'content-suggestion-v1';

export interface ContentSuggestion {
  text: string;
  basedOn: string;
}

const SYSTEM_PROMPT = `You generate concrete, ready-to-use hook/headline text for a piece of social media content, using ONLY the content-creation techniques given to you below. You do not invent new copywriting rules or templates that are not in the given list — if a given technique includes literal example phrases, you may adapt them to the topic, but the underlying technique must come from the list.

Rules:
- Use ONLY the techniques provided. Do not draw on general copywriting knowledge beyond them.
- Every suggestion must be usable as-is (a real hook or headline line), not a description of what a hook could be.
- For every suggestion, name which given technique (by its title) it is based on.
- Output ONLY a single JSON object, no markdown, no code fences, no commentary before or after it, with exactly this shape: { "suggestions": [ { "text": "...", "basedOn": "..." }, ... ] }.
- Generate between 3 and 6 suggestions, each based on a different technique when possible.`;

export function buildContentSuggestionPrompt(
  topic: string,
  knowledge: ContentKnowledge[],
): { systemPrompt: string; messages: AIMessage[] } {
  const knowledgeLines = knowledge
    .map((entry) => `- [${entry.title}] (${entry.categories.join(', ')}) ${entry.content}`)
    .join('\n\n');

  const userMessage = [`Topic: ${topic}`, `Available techniques:\n${knowledgeLines}`].join('\n\n');

  return {
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  };
}
