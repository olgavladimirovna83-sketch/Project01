import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation } from '../../src/decision/recommendationPersistence';
import { generateDecisionExplanation } from '../../src/ai/decisionExplanation';
import type { AIGenerateRequest, AIGenerateResult } from '../../src/ai/AIProvider';

/**
 * Task 9.1 — против реальной БД (не мок), но БЕЗ обращения к реальному
 * Anthropic API — `generate` внедряется фиктивной функцией (см.
 * `generateDecisionExplanation`'s DI-параметр). Живой end-to-end прогон —
 * отдельный `decision-explanation-live.smoke.test.ts`, skip-if-no-credentials,
 * тот же принцип, что Instagram (Task 3.2).
 *
 * Главная проверка помимо happy path: §67/§68 (AI не пишет в domain state) —
 * `Recommendation` строго не меняется этим вызовом, только читается.
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

async function createAccount(userId: string) {
  return prisma.externalAccount.create({
    data: {
      userId,
      platform: 'instagram',
      externalUserId: `explain-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
}

async function seedReachContentAndRecommendation(userId: string) {
  const account = await createAccount(userId);
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `explain-reel-${Date.now()}-${i}`,
        contentType: 'reel',
        publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 300, measuredAt: new Date() },
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `explain-carousel-${Date.now()}-${i}`,
        contentType: 'carousel',
        publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 50, measuredAt: new Date() },
    });
  }
  await prisma.goal.create({ data: { userId, goalType: 'reach', priority: 1 } });
  const result = await createRecommendation(userId);
  if (!result.created) throw new Error('expected a Recommendation to be created for the test fixture');
  return result.recommendation;
}

const VALID_EXPLANATION = {
  whyNow: 'Reels are currently your strongest format for reach.',
  evidence: 'Reels are above your personal baseline with high confidence.',
  expectedBenefit: 'Likely continued above-average reach if you keep posting reels.',
  uncertainty: 'Confidence is high, but the personal baseline is still based on limited history.',
};

function fakeGenerate(result: Partial<AIGenerateResult>) {
  return async (_request: AIGenerateRequest): Promise<AIGenerateResult> => ({
    text: '',
    provider: 'fake',
    model: 'fake-model-v1',
    promptVersion: 'decision-explanation-v1',
    usage: { inputTokens: 10, outputTokens: 20 },
    status: 'completed',
    ...result,
  });
}

describe('generateDecisionExplanation', () => {
  it('returns not_found and creates no AiRun for a non-existent recommendation', async () => {
    const user = await createUser();
    let called = false;
    const generate = async (request: AIGenerateRequest) => {
      called = true;
      return fakeGenerate({})(request);
    };

    const result = await generateDecisionExplanation('does-not-exist', user.id, generate);

    expect(result).toEqual({ status: 'not_found' });
    expect(called).toBe(false); // AI не вызывается вовсе, если рекомендацию нельзя прочитать
  });

  it("returns not_found (not a different error) when the recommendation belongs to another user", async () => {
    const owner = await createUser();
    const recommendation = await seedReachContentAndRecommendation(owner.id);
    const otherUser = await createUser();

    const result = await generateDecisionExplanation(
      recommendation.id,
      otherUser.id,
      fakeGenerate({ text: JSON.stringify(VALID_EXPLANATION) }),
    );

    expect(result).toEqual({ status: 'not_found' });
    const runs = await prisma.aiRun.findMany({ where: { recommendationId: recommendation.id } });
    expect(runs).toHaveLength(0);
  });

  it('generates and persists a valid explanation, and does not modify the Recommendation itself (§67/§68)', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);
    const before = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });

    const result = await generateDecisionExplanation(
      recommendation.id,
      user.id,
      fakeGenerate({ text: JSON.stringify(VALID_EXPLANATION), model: 'fake-model-v1' }),
    );

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') throw new Error('expected completed');
    expect(result.explanation).toEqual(VALID_EXPLANATION);

    const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
    expect(aiRun).toMatchObject({
      recommendationId: recommendation.id,
      provider: 'fake',
      model: 'fake-model-v1',
      promptVersion: 'decision-explanation-v1',
      status: 'completed',
      inputTokens: 10,
      outputTokens: 20,
    });
    expect(aiRun?.output).toEqual(VALID_EXPLANATION);
    expect(aiRun?.latencyMs).toBeGreaterThanOrEqual(0);

    // §67/§68 — Recommendation не должна была измениться этим вызовом.
    const after = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });
    expect(after).toEqual(before);
  });

  it('persists validation_failed with the raw text when the model output is not valid JSON', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    const result = await generateDecisionExplanation(
      recommendation.id,
      user.id,
      fakeGenerate({ text: 'This format looks great, no JSON here.' }),
    );

    expect(result).toEqual({ status: 'validation_failed', aiRunId: expect.any(String) });
    if (result.status !== 'validation_failed') throw new Error('expected validation_failed');
    const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
    expect(aiRun?.status).toBe('validation_failed');
    expect(aiRun?.output).toEqual({ raw: 'This format looks great, no JSON here.' });
  });

  it('persists a provider-level failure status without fabricating an explanation', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    const result = await generateDecisionExplanation(
      recommendation.id,
      user.id,
      fakeGenerate({ status: 'provider_unavailable', text: '' }),
    );

    expect(result).toEqual({ status: 'provider_unavailable', aiRunId: expect.any(String) });
    if (result.status !== 'provider_unavailable') throw new Error('expected provider_unavailable');
    const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
    expect(aiRun?.status).toBe('provider_unavailable');
    expect(aiRun?.output).toBeNull();
  });
});
