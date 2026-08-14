import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { captureAnalyticsMemory } from '../../src/knowledge/analyticsMemory';

/**
 * Task 7.1 — против реальной БД (не мок), тот же паттерн, что Task 5.x/6.x.
 * Не делает сетевых вызовов к Instagram — captureAnalyticsMemory только
 * читает уже посчитанную аналитику (Task 6.1/6.2) и пишет Memory.
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

describe('captureAnalyticsMemory', () => {
  it('creates no Memory rows for an account with no data at all (insufficient_data everywhere)', async () => {
    const user = await createUser();
    await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `memory-empty-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const result = await captureAnalyticsMemory(user.id, { start, end });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(3); // reach/likes/saved, все insufficient_data

    const memories = await prisma.memory.findMany({ where: { userId: user.id } });
    expect(memories).toHaveLength(0);
  });

  it('creates one Memory fact per recordable metric, with correct type/source/confidence', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `memory-scale-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const now = new Date();
    // 20 публикаций — достаточно для high confidence и на baseline, и на период
    // (порог D-0019 — 15+), чтобы избежать неоднозначности low/medium в тесте.
    for (let i = 0; i < 20; i += 1) {
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `memory-post-${i}`,
          contentType: 'image',
          publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.performanceMetric.createMany({
        data: [
          { contentId: content.id, metricType: 'reach', value: 200, measuredAt: now },
          { contentId: content.id, metricType: 'likes', value: 20, measuredAt: now },
          { contentId: content.id, metricType: 'saved', value: 5, measuredAt: now },
        ],
      });
    }

    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const result = await captureAnalyticsMemory(user.id, { start, end: now });

    expect(result.created).toBe(3);
    expect(result.skipped).toBe(0);

    const memories = await prisma.memory.findMany({ where: { userId: user.id } });
    expect(memories).toHaveLength(3);
    for (const memory of memories) {
      expect(memory.memoryType).toBe('fact');
      expect(memory.source).toBe('analytics');
      expect(memory.confidence).toBe(0.8); // high confidence, 20 публикаций
      expect(memory.content).toContain('instagram/');
    }
    const metricsInContent = memories.map((m) => m.content.split('/')[1].split(':')[0]);
    expect(new Set(metricsInContent)).toEqual(new Set(['reach', 'likes', 'saved']));
  });

  it('creates new Memory rows on each call — snapshot semantics, not upsert', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `memory-snapshot-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const now = new Date();
    for (let i = 0; i < 5; i += 1) {
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `memory-snap-post-${i}`,
          contentType: 'image',
          publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.performanceMetric.create({
        data: { contentId: content.id, metricType: 'reach', value: 100, measuredAt: now },
      });
    }

    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const first = await captureAnalyticsMemory(user.id, { start, end: now });
    const second = await captureAnalyticsMemory(user.id, { start, end: now });

    expect(first.created).toBe(1); // только reach имеет данные
    expect(second.created).toBe(1);

    const memories = await prisma.memory.findMany({ where: { userId: user.id } });
    expect(memories).toHaveLength(2); // два отдельных вызова — две строки, не одна перезаписанная
  });
});
