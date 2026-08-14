import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { getRankedCandidates } from '../../src/decision/recommendationCandidates';

/**
 * Task 8.1 — против реальной БД (не мок). Не делает сетевых вызовов к
 * Instagram — getRankedCandidates только читает уже существующие таблицы.
 * Чистая логика (generateCandidateFormats/scoreAndRankCandidates) уже
 * покрыта юнит-тестами — здесь только end-to-end wiring: CANDIDATE_GENERATOR
 * (Content.contentType) → CANDIDATE_SCORER (Task 6.2 baseline + Task 7.2
 * Pattern) → RANKING_ENGINE, полностью на реальной БД.
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

describe('getRankedCandidates', () => {
  it('returns empty rankings for a user with no content at all', async () => {
    const user = await createUser();
    const result = await getRankedCandidates(user.id);
    expect(result.map((r) => r.metric)).toEqual(['reach', 'likes', 'saved']);
    expect(result.every((r) => r.ranking.length === 0)).toBe(true);
  });

  it('generates candidates only from formats the user actually posted, and ranks reel above carousel for reach', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    const now = new Date();

    // 5 reel постов с высоким reach, 5 carousel с низким — реальные данные
    // через БД, не синтетический массив в памяти.
    for (let i = 0; i < 5; i += 1) {
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `cand-reel-${i}`,
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
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `cand-carousel-${i}`,
          contentType: 'carousel',
          publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.performanceMetric.create({
        data: { contentId: content.id, metricType: 'reach', value: 50, measuredAt: now },
      });
    }

    const result = await getRankedCandidates(user.id);
    const reachRanking = result.find((r) => r.metric === 'reach')!;

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

    await getRankedCandidates(user.id);

    const recommendations = await prisma.recommendation.findMany({ where: { userId: user.id } });
    expect(recommendations).toHaveLength(0);
  });
});
