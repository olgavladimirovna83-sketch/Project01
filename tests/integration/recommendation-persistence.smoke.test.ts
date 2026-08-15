import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation, DECISION_VERSION } from '../../src/decision/recommendationPersistence';

/**
 * Task 8.3 — против реальной БД (не мок). Замыкает цикл «решение → можно
 * объяснить и найти позже» (Olga): пишет `Recommendation`+`RecommendationReason`,
 * затем читает их обратно через ту же таблицу. Чистая логика ranking/goal
 * fit уже покрыта юнит-тестами Task 8.1/8.2 — здесь только персистентность:
 * что реально попадает в БД, и что честно НЕ создаётся при отсутствии
 * данных.
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
      externalUserId: `persist-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
}

async function seedReachContent(userId: string, accountId: string, now: Date) {
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: accountId,
        externalContentId: `persist-reel-${Date.now()}-${i}`,
        contentType: 'reel',
        publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 300, measuredAt: now },
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: accountId,
        externalContentId: `persist-carousel-${Date.now()}-${i}`,
        contentType: 'carousel',
        publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 50, measuredAt: now },
    });
  }
}

describe('createRecommendation', () => {
  it('does not create a Recommendation when the user has no goals', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());

    const result = await createRecommendation(user.id);

    expect(result).toEqual({ created: false, reason: 'no_goals_defined' });
    const rows = await prisma.recommendation.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it('does not create a Recommendation when the only goal is untracked ("followers", D-0018)', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    await prisma.goal.create({ data: { userId: user.id, goalType: 'followers', priority: 1 } });

    const result = await createRecommendation(user.id);

    expect(result).toEqual({ created: false, reason: 'no_tracked_goals' });
    const rows = await prisma.recommendation.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it('does not create a Recommendation when the goal is tracked but there is no content at all', async () => {
    const user = await createUser();
    await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 1 } });

    const result = await createRecommendation(user.id);

    expect(result).toEqual({ created: false, reason: 'no_candidates' });
  });

  it('creates a Recommendation with goal/baseline reasons and a JSON context snapshot when a goal matches real candidate data', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    const goal = await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 1 } });

    const result = await createRecommendation(user.id);

    expect(result.created).toBe(true);
    if (!result.created) throw new Error('expected created');

    expect(result.recommendation.userId).toBe(user.id);
    expect(result.recommendation.goalId).toBe(goal.id);
    expect(result.recommendation.primaryCandidate).toBe('reel'); // above baseline, D-0019 comparison
    expect(result.recommendation.decisionVersion).toBe(DECISION_VERSION);
    expect(result.recommendation.confidence).not.toBeNull();
    expect(result.recommendation.status).toBe('generated');

    const reasonTypes = result.recommendation.reasons.map((r) => r.reasonType).sort();
    expect(reasonTypes).toEqual(['baseline', 'goal']);
    const goalReason = result.recommendation.reasons.find((r) => r.reasonType === 'goal')!;
    expect(goalReason.description).toContain('reach');
    expect(goalReason.weight).toBeNull(); // §40 NO FALSE PRECISION — вес не придуман

    const context = result.recommendation.context as Record<string, unknown>;
    expect(context.primaryMetric).toBe('reach');
    expect(context.decisionVersion).toBe(DECISION_VERSION);
    expect(context.skeletonVersion).toBeNull();
    expect(Array.isArray(context.ranking)).toBe(true);

    // Персистентная запись читаема обратно — "найти позже".
    const stored = await prisma.recommendation.findUnique({
      where: { id: result.recommendation.id },
      include: { reasons: true },
    });
    expect(stored).not.toBeNull();
    expect(stored?.reasons).toHaveLength(2);
  });

  it('creates a distinct pattern reason only when a confirmed pattern agrees with the primary candidate\'s direction', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 1 } });
    await prisma.pattern.create({
      data: {
        userId: user.id,
        patternType: 'reach',
        description: 'reels outperform for reach',
        direction: 'positive',
        confidence: 0.9,
        status: 'confirmed',
      },
    });

    const result = await createRecommendation(user.id);
    expect(result.created).toBe(true);
    if (!result.created) throw new Error('expected created');

    const patternReason = result.recommendation.reasons.find((r) => r.reasonType === 'pattern');
    expect(patternReason).toBeDefined();
    expect(patternReason?.confidence).toBe(0.9); // реальный Pattern.confidence, не выдуманный
  });

  it('is append-only — a second call creates a second Recommendation row, not an update', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 1 } });

    await createRecommendation(user.id);
    await createRecommendation(user.id);

    const rows = await prisma.recommendation.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(2);
  });
});
