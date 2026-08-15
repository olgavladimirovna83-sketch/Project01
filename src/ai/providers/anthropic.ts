import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type { AIGenerateRequest, AIGenerateResult, AIProvider } from '../AIProvider';

const DEFAULT_TEXT_MODEL = process.env.ANTHROPIC_TEXT_MODEL ?? 'claude-sonnet-5';
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

/**
 * Единственный файл в проекте, которому разрешено импортировать
 * @anthropic-ai/sdk напрямую (CLAUDE.md §4.1, AI_SERVICE → AI_PROVIDER_ADAPTER).
 */
export function createAnthropicProvider(): AIProvider {
  const client = new Anthropic();

  return {
    name: 'anthropic',
    capabilities: {
      text: true,
      vision: true,
      structuredOutput: true,
    },
    async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
      try {
        const response = await client.messages.create({
          model: DEFAULT_TEXT_MODEL,
          max_tokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          system: request.systemPrompt,
          messages: request.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        });

        const textBlock = response.content.find((block) => block.type === 'text');

        return {
          text: textBlock?.type === 'text' ? textBlock.text : '',
          provider: 'anthropic',
          model: response.model,
          promptVersion: request.promptVersion,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          status: 'completed',
        };
      } catch (error) {
        // Найдено вручную (Olga, 15 августа 2026): раньше эта ветка молча
        // проглатывала реальную причину сбоя — `status: 'provider_unavailable'`
        // выглядел одинаково что при отсутствующем ключе, что при реальном
        // 400 от Anthropic ("credit balance too low"), что при rate limit.
        // Логируем настоящую причину здесь же, до возврата общего статуса —
        // независимая, полезная правка (observability), не завязана на
        // конкретный ai_run/request, поэтому не в domain-коде выше.
        const details =
          error instanceof APIError
            ? `status=${error.status ?? 'n/a'} type=${error.type ?? 'unknown'} message=${error.message}`
            : error instanceof Error
              ? error.message
              : String(error);
        // eslint-disable-next-line no-console
        console.error(`[AIProvider:anthropic] generate() failed — ${details}`);

        return {
          text: '',
          provider: 'anthropic',
          model: DEFAULT_TEXT_MODEL,
          promptVersion: request.promptVersion,
          usage: { inputTokens: 0, outputTokens: 0 },
          status: 'provider_unavailable',
        };
      }
    },
  };
}
