import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { getDecisionCandidates } from '../../src/decision/recommendationCandidates';

/**
 * Task 8.1 — против реальной БД (не мок). Не делает сетевых вызовов к
 * Instagram — getDecisionCandidates только читает уже существующие
 * таблицы. Чистая логика (generateCandidateFormats/scoreAndRankCandidates/
 * determineGoalFit) уже покрыта юнит-тестами — здесь только end-to-end
 * wiring: CANDIDATE_GENERATOR (Content.contentType) → CANDIDATE_SCORER
 * (Task 6.2 baseline + Task 7.2 Pattern) → RANKING_ENGINE → GOAL_FIT
 * (Task 8.2, Goal.priority), полностью на реальной БД.
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
      externalUserId: `candidates-${Date.now()}-${Math.random()}`,
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
        externalContentId: `cand-reel-${Date.now()}-${i}`,
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
        externalContentId: `cand-carousel-${Date.now()}-${i}`,
        contentType: 'carousel',
        publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 50, measuredAt: now },
    });
  }
}

describe('getDecisionCandidates', () => {
  it('returns empty rankings and no_goals_defined for a user with no content and no goals', async () => {
    const user = await createUser();
    const result = await getDecisionCandidates(user.id);
    expect(result.rankings.map((r) => r.metric)).toEqual(['reach', 'likes', 'saved']);
    expect(result.rankings.every((r) => r.ranking.length === 0)).toBe(true);
    expect(result.goalFit).toEqual({
      primaryMetric: null,
      reason: 'no_goals_defined',
      matchedGoal: null,
      untrackedGoals: [],
    });
    expect(result.primaryRanking).toBeNull();
  });

  it('generates candidates only from formats the user actually posted, and ranks reel above carousel for reach', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());

    const result = await getDecisionCandidates(user.id);
    const reachRanking = result.rankings.find((r) => r.metric === 'reach')!;

    expect(reachRanking.ranking.map((r) => r.candidate).sort()).toEqual(['carousel', 'reel']);
    expect(reachRanking.ranking[0].candidate).toBe('reel');
    expect(reachRanking.ranking[0].comparison).toBe('above');
    expect(reachRanking.ranking[1].candidate).toBe('carousel');
    expect(reachRanking.ranking[1].comparison).toBe('below');
    // Формат, которого пользователь никогда не публиковал, не появляется.
    expect(reachRanking.ranking.map((r) => r.candidate)).not.toContain('image');
  });

  it('does not write anything to the Recommendation table — read-only step', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    const content = await prisma.content.create({
      data: {
        userId: user.id,
        externalAccountId: account.id,
        externalContentId: `cand-readonly-${Date.now()}`,
        contentType: 'image',
        publishedAt: new Date(),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 100, measuredAt: new Date() },
    });

    await getDecisionCandidates(user.id);

    const recommendations = await prisma.recommendation.findMany({ where: { userId: user.id } });
    expect(recommendations).toHaveLength(0);
  });

  it('selects the reach ranking as primary when the user\'s only goal is reach', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 1 } });

    const result = await getDecisionCandidates(user.id);

    expect(result.goalFit.reason).toBe('goal_matched');
    expect(result.goalFit.primaryMetric).toBe('reach');
    expect(result.primaryRanking?.metric).toBe('reach');
    expect(result.primaryRanking?.ranking[0].candidate).toBe('reel');
  });

  it('explicitly reports no_tracked_goals when the only goal is "followers" (not collected, D-0018)', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    await prisma.goal.create({ data: { userId: user.id, goalType: 'followers', priority: 1 } });

    const result = await getDecisionCandidates(user.id);

    expect(result.goalFit.reason).toBe('no_tracked_goals');
    expect(result.goalFit.primaryMetric).toBeNull();
    expect(result.goalFit.untrackedGoals).toEqual(['followers']);
    expect(result.primaryRanking).toBeNull();
    // Per-metric рейтинги по-прежнему возвращаются — goal fit не может
    // выбрать первичную метрику, но не молчаливо прячет остальной вывод.
    expect(result.rankings.find((r) => r.metric === 'reach')?.ranking.length).toBeGreaterThan(0);
  });

  it('falls through to the lower-priority tracked goal when the top goal is untracked', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    await seedReachContent(user.id, account.id, new Date());
    // followers (приоритет 1, главная цель) — не трекается; reach (приоритет 2) — трекается.
    await prisma.goal.create({ data: { userId: user.id, goalType: 'followers', priority: 1 } });
    await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 2 } });

    const result = await getDecisionCandidates(user.id);

    expect(result.goalFit.reason).toBe('goal_matched');
    expect(result.goalFit.primaryMetric).toBe('reach');
    expect(result.goalFit.untrackedGoals).toEqual(['followers']);
  });
});
