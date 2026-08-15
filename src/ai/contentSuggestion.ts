import type { Prisma } from '@prisma/client';
import { aiRunRepository, contentKnowledgeRepository } from '@/data/repositories';
import { AIService } from './AIService';
import type { AIGenerateResult } from './AIProvider';
import {
  buildContentSuggestionPrompt,
  CONTENT_SUGGESTION_PROMPT_VERSION,
  type ContentSuggestion,
} from './contentSuggestionPrompt';
import { parseContentSuggestions } from './contentSuggestionValidation';

/**
 * Task 9.4 — Phase 9, AI Layer. Вторая реальная AI-задача (после Task 9.1),
 * зеркально по форме: промпт + эндпоинт + валидация + AiRun-логирование.
 * Единственная цель — увидеть вживую, как уже загруженные 15 записей
 * `ContentKnowledge` (Task 9.3) реально работают, прежде чем пополнять базу
 * дальше (прямой приоритет Olga) — не инфраструктура сама по себе (§73
 * КРИТИЧЕСКОЕ ПРАВИЛО).
 *
 * Обязательные ограничения — те же, что Task 9.1, и по той же причине:
 * - §67/§68 — эта функция только ЧИТАЕТ `ContentKnowledge` (через
 *   `findActive`), никогда не пишет и не изменяет её. Пишет исключительно
 *   в `AiRun`.
 * - §11/§26 — структурированный JSON output, валидация до персистентности
 *   (`parseContentSuggestions`).
 * - §24 AI RUN/§76 — `AiRun` создаётся при любом исходе AI-запроса.
 * - §16 AI HALLUCINATION CONTROL/§20 EVIDENCE-FIRST — реализовано на
 *   уровне промпта (`contentSuggestionPrompt.ts`): модели передаются
 *   только реально загруженные приёмы, прямой запрет придумывать новые.
 *
 * Честные состояния (тот же принцип, что весь проект — не молчаливое
 * предположение): пустая тема и отсутствие подходящих `ContentKnowledge`
 * записей НЕ вызывают AI и НЕ создают `AiRun` — генерировать не из чего,
 * вызов был бы либо пустым, либо AI придумывал бы приёмы сам (то, что
 * прямо запрещено).
 *
 * `generate` — тот же DI-параметр, что Task 9.1, по той же причине
 * (реальный `AIService` недетерминирован и стоит денег).
 */

const DEFAULT_CATEGORIES = ['hook_template', 'headline_rule'];

export type GenerateContentSuggestionsResult =
  | { status: 'invalid_topic' }
  | { status: 'no_knowledge_available' }
  | { status: 'completed'; suggestions: ContentSuggestion[]; aiRunId: string }
  | { status: 'failed' | 'timeout' | 'provider_unavailable'; aiRunId: string }
  | { status: 'validation_failed'; aiRunId: string };

type GenerateFn = typeof AIService.generate;

export async function generateContentSuggestions(
  topic: string,
  userId: string,
  category?: string,
  generate: GenerateFn = AIService.generate,
): Promise<GenerateContentSuggestionsResult> {
  const trimmedTopic = topic.trim();
  if (trimmedTopic.length === 0) {
    return { status: 'invalid_topic' };
  }

  const categories = category ? [category] : DEFAULT_CATEGORIES;
  const knowledgeGroups = await Promise.all(categories.map((c) => contentKnowledgeRepository.findActive(c)));
  // Task 9.7 — categories стала String[] (D-0033): запись с несколькими
  // тегами может теперь реально попасть в несколько групп сразу (например,
  // запись с тегами hook_template+headline_rule при DEFAULT_CATEGORIES) —
  // де-дублируем по id, иначе модель увидела бы её дважды в промпте.
  const seenIds = new Set<string>();
  const knowledge = knowledgeGroups.flat().filter((entry) => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });

  if (knowledge.length === 0) {
    return { status: 'no_knowledge_available' };
  }

  const { systemPrompt, messages } = buildContentSuggestionPrompt(trimmedTopic, knowledge);
  const startedAt = Date.now();
  const result: AIGenerateResult = await generate({
    task: 'generation',
    systemPrompt,
    messages,
    promptVersion: CONTENT_SUGGESTION_PROMPT_VERSION,
  });
  const latencyMs = Date.now() - startedAt;

  const baseRunData = {
    user: { connect: { id: userId } },
    provider: result.provider,
    model: result.model,
    promptVersion: result.promptVersion,
    inputContext: { topic: trimmedTopic, categories } as unknown as Prisma.InputJsonValue,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    latencyMs,
  };

  if (result.status !== 'completed') {
    const aiRun = await aiRunRepository.create({ ...baseRunData, status: result.status });
    return { status: result.status, aiRunId: aiRun.id };
  }

  const suggestions = parseContentSuggestions(result.text);
  if (suggestions === null) {
    const aiRun = await aiRunRepository.create({
      ...baseRunData,
      status: 'validation_failed',
      output: { raw: result.text } as unknown as Prisma.InputJsonValue,
    });
    return { status: 'validation_failed', aiRunId: aiRun.id };
  }

  const aiRun = await aiRunRepository.create({
    ...baseRunData,
    status: 'completed',
    output: { suggestions } as unknown as Prisma.InputJsonValue,
  });

  return { status: 'completed', suggestions, aiRunId: aiRun.id };
}
