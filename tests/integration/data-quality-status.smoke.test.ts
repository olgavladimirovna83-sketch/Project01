import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { getDataQualityStatus } from '../../src/dataQuality/dataQualityStatus';

/**
 * Task 5.1 — против реальной БД (не мок), как остальные интеграционные
 * smoke-тесты в проекте. Не делает никаких сетевых вызовов к Instagram —
 * getDataQualityStatus только читает уже существующие таблицы, поэтому
 * тест не gated по INSTAGRAM_*-credentials, в отличие от sync-тестов.
 */

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const userId of createdUserIds) {
    // onDelete: Cascade — user -> ExternalAccount -> AccountSnapshot,
    // user -> Content -> PerformanceMetric.
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
  createdUserIds.push(user.id);
  return user;
}

describe('getDataQualityStatus', () => {
  it('reports never_synced for an account that has never completed a sync', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-never-synced-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.externalAccountId).toBe(account.id);
    expect(status.connectionStatus).toBe('connected');
    expect(status.hasRecentFailure).toBe(false);
    expect(status.lastSyncedAt).toBeNull();
    expect(status.freshness).toBe('never_synced');
    // Ни один пробел не сообщается для "никогда не синхронизировался" —
    // это уже полностью покрыто freshness, не дублируется как gap.
    expect(status.gaps).toEqual([]);
  });

  it('reports fresh with no gaps once content and account snapshots exist', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-fresh-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
      },
    });
    const content = await prisma.content.create({
      data: {
        userId: user.id,
        externalAccountId: account.id,
        externalContentId: `dq-content-${Date.now()}`,
        contentType: 'image',
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'likes', value: 10, measuredAt: new Date() },
    });
    await prisma.accountSnapshot.create({
      data: {
        externalAccountId: account.id,
        metricType: 'reach',
        value: 100,
        capturedAt: new Date(),
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.freshness).toBe('fresh');
    expect(status.gaps).toEqual([]);
    expect(status.lastContentMetricAt).not.toBeNull();
    expect(status.lastAccountSnapshotAt).not.toBeNull();
  });

  it('reports stale once lastSyncedAt is older than the freshness threshold', async () => {
    const user = await createUser();
    await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-stale-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.freshness).toBe('stale');
  });

  it('flags no_content_synced and no_account_snapshots as explicit gaps after a sync with nothing stored', async () => {
    const user = await createUser();
    await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-gaps-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.gaps).toEqual(
      expect.arrayContaining(['no_content_synced', 'no_account_snapshots']),
    );
  });

  it('surfaces hasRecentFailure when ExternalAccount.status is expired', async () => {
    const user = await createUser();
    await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-expired-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
        status: 'expired',
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.connectionStatus).toBe('expired');
    expect(status.hasRecentFailure).toBe(true);
  });

  it('returns an empty array for a user with no external accounts at all', async () => {
    const user = await createUser();
    const result = await getDataQualityStatus(user.id);
    expect(result).toEqual([]);
  });
});
