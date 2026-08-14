import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { detectPatterns } from '../../src/knowledge/patternDetection';

/**
 * Task 7.2 — против реальной БД (не мок). Не делает сетевых вызовов к
 * Instagram — detectPatterns только читает уже существующие таблицы.
 * Чистая логика (detectMetricPattern) уже покрыта юнит-тестами
 * (tests/unit/pattern-detection.test.ts) — здесь только end-to-end
 * wiring через реальную БД, включая upsert-семантику Pattern (в отличие
 * от snapshot-семантики Task 4.1/4.2/7.1).
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
      externalUserId: `pattern-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
}

describe('detectPatterns', () => {
  it('detects and creates nothing for a fresh account with no content', async () => {
    const user = await createUser();
    await createAccount(user.id);

    const result = await detectPatterns(user.id);

    expect(result.detected).toBe(0);
    expect(result.skipped).toBe(3); // reach/likes/saved — все без данных

    const patterns = await prisma.pattern.findMany({ where: { userId: user.id } });
    expect(patterns).toHaveLength(0);
  });

  it('creates a positive Pattern when reach consistently runs above baseline across many posts', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    const now = new Date();

    // 2 поста с низким reach, 5 с высоким — та же пропорция, что в
    // юнит-тесте (consistency ≈ 0.71, выше порога 0.6).
    const values = [100, 100, 200, 200, 200, 200, 200];
    for (let i = 0; i < values.length; i += 1) {
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `pattern-post-${i}`,
          contentType: 'image',
          publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.performanceMetric.create({
        data: { contentId: content.id, metricType: 'reach', value: values[i], measuredAt: now },
      });
    }

    const result = await detectPatterns(user.id);
    expect(result.detected).toBe(1); // только reach — likes/saved без данных
    expect(result.skipped).toBe(2);

    const patterns = await prisma.pattern.findMany({ where: { userId: user.id } });
    expect(patterns).toHaveLength(1);
    expect(patterns[0].patternType).toBe('reach');
    expect(patterns[0].direction).toBe('positive');
    expect(patterns[0].status).toBe('hypothesis'); // Prisma-дефолт, лайфцикл не реализован в Task 7.2
    expect(patterns[0].confidence).toBeGreaterThan(0);
    expect(patterns[0].lastConfirmedAt).not.toBeNull();
  });

  it('updates the existing Pattern (upsert), not create a new row, on repeated detection', async () => {
    const user = await createUser();
    const account = await createAccount(user.id);
    const now = new Date();

    const values = [100, 100, 200, 200, 200, 200, 200];
    for (let i = 0; i < values.length; i += 1) {
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `pattern-upsert-post-${i}`,
          contentType: 'image',
          publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.performanceMetric.create({
        data: { contentId: content.id, metricType: 'reach', value: values[i], measuredAt: now },
      });
    }

    const first = await detectPatterns(user.id);
    const patternsAfterFirst = await prisma.pattern.findMany({ where: { userId: user.id } });
    const firstConfirmedAt = patternsAfterFirst[0].lastConfirmedAt;

    const second = await detectPatterns(user.id);
    const patternsAfterSecond = await prisma.pattern.findMany({ where: { userId: user.id } });

    expect(first.detected).toBe(1);
    expect(second.detected).toBe(1);
    expect(patternsAfterSecond).toHaveLength(1); // не 2 — обновление, не новая строка
    expect(patternsAfterSecond[0].id).toBe(patternsAfterFirst[0].id);
    expect(patternsAfterSecond[0].lastConfirmedAt!.getTime()).toBeGreaterThanOrEqual(
      firstConfirmedAt!.getTime(),
    );
  });
});
