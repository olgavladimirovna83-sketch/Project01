import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { generateContentSuggestions } from '../../src/ai/contentSuggestion';
import type { AIGenerateRequest, AIGenerateResult } from '../../src/ai/AIProvider';

/**
 * Task 9.4 — против реальной БД (не мок), но БЕЗ обращения к реальному
 * Anthropic API — `generate` внедряется фиктивной функцией, тот же принцип,
 * что `decision-explanation.smoke.test.ts` (Task 9.1). Использует реально
 * загруженные (Task 9.3) `ContentKnowledge` записи — не создаёт свои,
 * `ContentKnowledge` не пользовательская сущность, тестовые данные под неё
 * не нужны.
 */

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const userId of createdUserIds) {
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
  createdUserIds.push(user.id);
  return user;
}

const VALID_RESULT = {
  suggestions: [
    { text: 'But what they don\'t tell you about mornings is _____', basedOn: 'Mid-Sentence Hook' },
    { text: 'Anti Basic Skincare', basedOn: 'Headline Rule' },
  ],
};

function fakeGenerate(result: Partial<AIGenerateResult>) {
  return async (_request: AIGenerateRequest): Promise<AIGenerateResult> => ({
    text: '',
    provider: 'fake',
    model: 'fake-model-v1',
    promptVersion: 'content-suggestion-v1',
    usage: { inputTokens: 10, outputTokens: 20 },
    status: 'completed',
    ...result,
  });
}

describe('generateContentSuggestions', () => {
  it('returns invalid_topic and calls no AI for an empty topic, without creating an AiRun', async () => {
    const user = await createUser();
    let called = false;
    const generate = async (request: AIGenerateRequest) => {
      called = true;
      return fakeGenerate({})(request);
    };

    const result = await generateContentSuggestions('   ', user.id, undefined, generate);

    expect(result).toEqual({ status: 'invalid_topic' });
    expect(called).toBe(false);
    const runs = await prisma.aiRun.findMany({ where: { userId: user.id } });
    expect(runs).toHaveLength(0);
  });

  it('returns no_knowledge_available and calls no AI when the requested category has no active records', async () => {
    const user = await createUser();
    let called = false;
    const generate = async (request: AIGenerateRequest) => {
      called = true;
      return fakeGenerate({})(request);
    };

    const result = await generateContentSuggestions(
      'a reel about mornings',
      user.id,
      'category_that_does_not_exist',
      generate,
    );

    expect(result).toEqual({ status: 'no_knowledge_available' });
    expect(called).toBe(false);
    const runs = await prisma.aiRun.findMany({ where: { userId: user.id } });
    expect(runs).toHaveLength(0);
  });

  it('generates and persists suggestions using the real hook_template knowledge, logging a real AiRun', async () => {
    const user = await createUser();

    const result = await generateContentSuggestions(
      'a reel about morning skincare',
      user.id,
      'hook_template',
      fakeGenerate({ text: JSON.stringify(VALID_RESULT), model: 'fake-model-v1' }),
    );

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') throw new Error('expected completed');
    expect(result.suggestions).toEqual(VALID_RESULT.suggestions);

    const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
    expect(aiRun).toMatchObject({
      userId: user.id,
      recommendationId: null,
      provider: 'fake',
      model: 'fake-model-v1',
      promptVersion: 'content-suggestion-v1',
      status: 'completed',
    });
    expect(aiRun?.output).toEqual(VALID_RESULT);
    expect(aiRun?.inputContext).toMatchObject({ topic: 'a reel about morning skincare', categories: ['hook_template'] });
  });

  it('persists validation_failed with the raw text when the model output is not valid JSON', async () => {
    const user = await createUser();

    const result = await generateContentSuggestions(
      'a topic',
      user.id,
      'hook_template',
      fakeGenerate({ text: 'Here are some great hooks for you...' }),
    );

    expect(result).toEqual({ status: 'validation_failed', aiRunId: expect.any(String) });
    if (result.status !== 'validation_failed') throw new Error('expected validation_failed');
    const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
    expect(aiRun?.status).toBe('validation_failed');
    expect(aiRun?.output).toEqual({ raw: 'Here are some great hooks for you...' });
  });

  it('persists a provider-level failure status without fabricating suggestions', async () => {
    const user = await createUser();

    const result = await generateContentSuggestions(
      'a topic',
      user.id,
      'hook_template',
      fakeGenerate({ status: 'provider_unavailable', text: '' }),
    );

    expect(result).toEqual({ status: 'provider_unavailable', aiRunId: expect.any(String) });
    if (result.status !== 'provider_unavailable') throw new Error('expected provider_unavailable');
    const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
    expect(aiRun?.status).toBe('provider_unavailable');
    expect(aiRun?.output).toBeNull();
  });
});
