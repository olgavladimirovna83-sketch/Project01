import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation } from '../../src/decision/recommendationPersistence';
import { recordUserDecision } from '../../src/decision/userDecisionPersistence';

/**
 * Task 10.4 — против реальной БД (не мок). Первый реальный прогон
 * `UserDecision` (модель существовала с Task 1.1, ни разу не
 * использовалась). Покрывает: honest not_found (несуществующая/чужая
 * рекомендация), honest invalid_input (modified/alternative_selected без
 * selectedCandidate), реальную запись `UserDecision` + реальный переход
 * `Recommendation.status`, и append-only поведение при повторном решении.
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
      externalUserId: `decide-${Date.now()}-${Math.random()}`,
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
        externalContentId: `decide-reel-${Date.now()}-${i}`,
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
        externalContentId: `decide-carousel-${Date.now()}-${i}`,
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

describe('recordUserDecision', () => {
  it('returns not_found for a non-existent recommendation', async () => {
    const user = await createUser();

    const result = await recordUserDecision('does-not-exist', user.id, { decisionType: 'accepted' });

    expect(result).toEqual({ recorded: false, reason: 'not_found' });
  });

  it("returns not_found (not a different error) when the recommendation belongs to another user", async () => {
    const owner = await createUser();
    const recommendation = await seedReachContentAndRecommendation(owner.id);
    const otherUser = await createUser();

    const result = await recordUserDecision(recommendation.id, otherUser.id, { decisionType: 'accepted' });

    expect(result).toEqual({ recorded: false, reason: 'not_found' });
    const decisions = await prisma.userDecision.findMany({ where: { recommendationId: recommendation.id } });
    expect(decisions).toHaveLength(0);
  });

  it('returns invalid_input for "modified" without selectedCandidate, and does not write anything', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    const result = await recordUserDecision(recommendation.id, user.id, { decisionType: 'modified' });

    expect(result).toEqual({
      recorded: false,
      reason: 'invalid_input',
      message: expect.stringContaining('selectedCandidate'),
    });
    const decisions = await prisma.userDecision.findMany({ where: { recommendationId: recommendation.id } });
    expect(decisions).toHaveLength(0);
    const unchanged = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });
    expect(unchanged.status).toBe('generated');
  });

  it('records an "accepted" decision and transitions Recommendation.status to accepted', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    const result = await recordUserDecision(recommendation.id, user.id, {
      decisionType: 'accepted',
      comment: 'looks good',
    });

    expect(result.recorded).toBe(true);
    if (!result.recorded) throw new Error('expected recorded');
    expect(result.decision).toMatchObject({
      recommendationId: recommendation.id,
      userId: user.id,
      decisionType: 'accepted',
      selectedCandidate: null,
      comment: 'looks good',
    });

    const updated = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });
    expect(updated.status).toBe('accepted');
  });

  it('records a "modified" decision with selectedCandidate and transitions status to modified', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    const result = await recordUserDecision(recommendation.id, user.id, {
      decisionType: 'modified',
      selectedCandidate: 'carousel',
    });

    expect(result.recorded).toBe(true);
    if (!result.recorded) throw new Error('expected recorded');
    expect(result.decision.selectedCandidate).toBe('carousel');

    const updated = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });
    expect(updated.status).toBe('modified');
  });

  it('records a "deferred" decision and transitions status to postponed, not rejected (D-0034)', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    const result = await recordUserDecision(recommendation.id, user.id, { decisionType: 'deferred' });
    expect(result.recorded).toBe(true);

    const updated = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });
    expect(updated.status).toBe('postponed');
  });

  it('is append-only — deciding twice creates two UserDecision rows, status reflects the latest', async () => {
    const user = await createUser();
    const recommendation = await seedReachContentAndRecommendation(user.id);

    await recordUserDecision(recommendation.id, user.id, { decisionType: 'deferred' });
    await recordUserDecision(recommendation.id, user.id, { decisionType: 'accepted' });

    const decisions = await prisma.userDecision.findMany({
      where: { recommendationId: recommendation.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(decisions).toHaveLength(2);
    expect(decisions.map((d) => d.decisionType)).toEqual(['deferred', 'accepted']);

    const updated = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendation.id } });
    expect(updated.status).toBe('accepted'); // самое последнее решение, не первое
  });
});
