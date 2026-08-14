import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { getUserAnalytics } from '../../src/analysis/accountAnalytics';

/**
 * Task 6.1 — против реальной БД (не мок). Не делает сетевых вызовов к
 * Instagram — getUserAnalytics только читает уже существующие таблицы,
 * не gated по INSTAGRAM_*-credentials. Чистая логика (summarizeMetric/
 * computeMetricsAnalytics) уже покрыта юнит-тестами на синтетических
 * данных (tests/unit/metrics-analytics.test.ts) — здесь только
 * end-to-end проверка wiring через реальную БД, на реалистичном
 * масштабе (25 публикаций), тем же паттерном, что Task 5.2/5.3.
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

describe('getUserAnalytics', () => {
  it('returns zeroed-out summaries for an account with no content at all', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `analytics-empty-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [analytics] = await getUserAnalytics(user.id, { start, end });

    expect(analytics.externalAccountId).toBe(account.id);
    expect(analytics.metrics.map((m) => m.metric)).toEqual(['reach', 'likes', 'saved']);
    for (const summary of analytics.metrics) {
      expect(summary.sampleSize).toBe(0);
      expect(summary.average).toBeNull();
      expect(summary.trend).toBe('insufficient_data');
    }
  });

  it('computes sum/average/trend at realistic scale (25 posts) through the real database', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `analytics-scale-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const now = new Date();
    const measuredAt = now;
    // 25 публикаций за последние 25 дней — первая половина периода c
    // низким reach (~100), вторая половина — заметно выше (~500), чтобы
    // тренд однозначно определился как 'up'.
    for (let i = 0; i < 25; i += 1) {
      const publishedAt = new Date(now.getTime() - (25 - i) * 24 * 60 * 60 * 1000);
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `analytics-post-${i}`,
          contentType: 'image',
          publishedAt,
        },
      });
      const reachValue = i < 12 ? 100 : 500;
      await prisma.performanceMetric.createMany({
        data: [
          { contentId: content.id, metricType: 'reach', value: reachValue, measuredAt },
          { contentId: content.id, metricType: 'likes', value: 10, measuredAt },
          { contentId: content.id, metricType: 'saved', value: 2, measuredAt },
        ],
      });
    }

    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [analytics] = await getUserAnalytics(user.id, { start, end: now });

    const reach = analytics.metrics.find((m) => m.metric === 'reach');
    expect(reach?.sampleSize).toBe(25);
    expect(reach?.sum).toBe(12 * 100 + 13 * 500);
    expect(reach?.trend).toBe('up');

    const likes = analytics.metrics.find((m) => m.metric === 'likes');
    expect(likes?.sampleSize).toBe(25);
    expect(likes?.sum).toBe(250);

    const saved = analytics.metrics.find((m) => m.metric === 'saved');
    expect(saved?.sampleSize).toBe(25);
    expect(saved?.sum).toBe(50);
  });
});
