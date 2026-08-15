import type { Prisma } from '@prisma/client';
import { aiRunRepository, recommendationRepository } from '@/data/repositories';
import { AIService } from './AIService';
import type { AIGenerateResult } from './AIProvider';
import {
  buildExplanationPrompt,
  DECISION_EXPLANATION_PROMPT_VERSION,
  type DecisionExplanation,
} from './decisionExplanationPrompt';
import { parseExplanation } from './decisionExplanationValidation';

/**
 * Task 9.1 — Phase 9, AI Layer. Первое реальное использование `AIService`
 * (существует с Task 0.2, до сих пор не вызывался ни одним domain-кодом).
 * Единственная задача: сгенерировать объяснение (§50 DECISION EXPLANATION,
 * `21_DECISION_LOGIC.md`) для уже сохранённой Task 8.3 `Recommendation` —
 * не инфраструктура сама по себе (`29_AI_LAYER.md` §73 КРИТИЧЕСКОЕ ПРАВИЛО:
 * AI используется только там, где действительно добавляет ценность).
 *
 * Обязательные ограничения с самого начала (Olga, прямое требование):
 * - §67 AI DOES NOT CONTROL DATABASE / §68 AI DOES NOT CONTROL DOMAIN
 *   STATE — эта функция только ЧИТАЕТ `Recommendation` (через
 *   `findByIdWithReasons`) и пишет ИСКЛЮЧИТЕЛЬНО в `AiRun` — собственную
 *   лог-таблицу AI-слоя. `Recommendation`/`RecommendationReason`/`Goal`/
 *   `Pattern`/baseline не изменяются нигде в этом файле.
 * - §11 STRUCTURED OUTPUT — `parseExplanation` требует конкретную JSON
 *   схему (4 строковых поля), не произвольный текст.
 * - §26 AI OUTPUT VALIDATION — output проверяется ДО персистентности;
 *   невалидный результат сохраняется как `validation_failed` с сырым
 *   текстом в `output.raw` (для отладки), не выдаётся как объяснение.
 * - §24 AI RUN/§76 КРИТИЧЕСКОЕ ПРАВИЛО №4 — каждый вызов создаёт `AiRun`
 *   (provider/model/promptVersion/status/latency/tokens/timestamp) вне
 *   зависимости от исхода — воспроизводимость не только для успехов.
 * - §35 EXPLANATION MUST NOT INVENT/§74 КРИТИЧЕСКОЕ ПРАВИЛО №2 —
 *   реализовано на уровне промпта (`decisionExplanationPrompt.ts`):
 *   модели передаётся реальный качественный confidence и прямой запрет
 *   утверждать больше уверенности, чем он поддерживает.
 *
 * `generate` — необязательный параметр с дефолтом `AIService.generate`,
 * единственная точка внедрения зависимости для тестов (реальный
 * `AIService` недетерминирован и стоит денег — интеграционные тесты
 * подставляют фиктивную функцию, не обращаются к настоящему Anthropic
 * API; см. `tests/integration/decision-explanation.smoke.test.ts`).
 */

export type GenerateExplanationResult =
  | { status: 'not_found' }
  | { status: 'completed'; explanation: DecisionExplanation; aiRunId: string }
  | { status: 'failed' | 'timeout' | 'provider_unavailable'; aiRunId: string }
  | { status: 'validation_failed'; aiRunId: string };

type GenerateFn = typeof AIService.generate;

export async function generateDecisionExplanation(
  recommendationId: string,
  userId: string,
  generate: GenerateFn = AIService.generate,
): Promise<GenerateExplanationResult> {
  const recommendation = await recommendationRepository.findByIdWithReasons(recommendationId);

  // Тот же принцип, что Task 2.3 (Goal ownership) — чужая рекомендация и
  // несуществующая рекомендация дают одинаковый исход, не палят разницу.
  if (recommendation === null || recommendation.userId !== userId) {
    return { status: 'not_found' };
  }

  const { systemPrompt, messages } = buildExplanationPrompt(recommendation);
  const startedAt = Date.now();
  const result: AIGenerateResult = await generate({
    task: 'explanation',
    systemPrompt,
    messages,
    promptVersion: DECISION_EXPLANATION_PROMPT_VERSION,
  });
  const latencyMs = Date.now() - startedAt;

  const baseRunData = {
    recommendation: { connect: { id: recommendationId } },
    provider: result.provider,
    model: result.model,
    promptVersion: result.promptVersion,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    latencyMs,
  };

  if (result.status !== 'completed') {
    const aiRun = await aiRunRepository.create({ ...baseRunData, status: result.status });
    return { status: result.status, aiRunId: aiRun.id };
  }

  const explanation = parseExplanation(result.text);
  if (explanation === null) {
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
    output: explanation as unknown as Prisma.InputJsonValue,
  });

  return { status: 'completed', explanation, aiRunId: aiRun.id };
}
