import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { getDataQualityStatus } from '../../src/dataQuality/dataQualityStatus';

/**
 * Task 5.1 — против реальной БД (не мок), как остальные интеграционные
 * smoke-тесты в проекте. Не делает никаких сетевых вызовов к Instagram —
 * getDataQualityStatus только читает уже существующие таблицы, поэтому
 * тест не gated по INSTAGRAM_*-credentials, в отличие от sync-тестов.
 *
 * Task 5.2 — completeness/anomaly detection логика (computeCompleteness/
 * detectSyncCountAnomaly) уже покрыта юнит-тестами на синтетических данных
 * (tests/unit/data-quality-completeness.test.ts,
 * tests/unit/data-quality-anomaly-detection.test.ts) — здесь только
 * end-to-end проверка wiring через реальную БД. Реальный live-датасет
 * Olga (25 публикаций/175 метрик), упомянутый в постановке задачи, на
 * момент реализации в dev-БД не сохранён (аккаунт сейчас disconnected,
 * 0 Content) — та живая проверка была временными данными throwaway-тестов
 * Task 4.1/4.3, удалёнными в afterAll, не персистентным датасетом.
 * Тесты ниже сеют такого же масштаба синтетические данные напрямую —
 * ровно то, что Olga попросила ("живой API не нужен").
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

  it('computes completeness at realistic scale (25 posts) and flags incomplete_metrics when some are missing', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-completeness-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
      },
    });

    const measuredAt = new Date();
    // 17 публикаций с полным набором метрик (все value != null), 8 —
    // с хотя бы одной недоступной метрикой (value: null,
    // 08_METRICS_FRAMEWORK.md §11 unavailableMetrics) — тот же 20-элементный
    // масштаб примера из 26_DATA_PIPELINE.md §57, расширенный до 25.
    for (let i = 0; i < 25; i += 1) {
      const content = await prisma.content.create({
        data: {
          userId: user.id,
          externalAccountId: account.id,
          externalContentId: `dq-post-${i}`,
          contentType: 'image',
        },
      });
      const isIncomplete = i < 8;
      await prisma.performanceMetric.createMany({
        data: [
          { contentId: content.id, metricType: 'likes', value: 10, measuredAt },
          { contentId: content.id, metricType: 'reach', value: 20, measuredAt },
          {
            contentId: content.id,
            metricType: 'saved',
            value: isIncomplete ? null : 5,
            measuredAt,
          },
        ],
      });
    }

    const [status] = await getDataQualityStatus(user.id);

    expect(status.completeness.totalContentWithMetrics).toBe(25);
    expect(status.completeness.completeContentCount).toBe(17);
    expect(status.completeness.completenessRatio).toBeCloseTo(17 / 25);
    expect(status.gaps).toContain('incomplete_metrics');
  });

  it('flags sync_count_anomaly when the most recent sync stored far fewer posts than history', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-anomaly-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
      },
    });

    // Два исторических прогона по 10 публикаций (дни -2/-1), последний —
    // только 2 (день 0). Даты далеко друг от друга по времени — заведомо
    // больше SYNC_RUN_GAP_MS, чтобы кластеризация надёжно различила прогоны.
    const runDates = [
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      new Date(),
    ];
    const runSizes = [10, 10, 2];

    for (let run = 0; run < runSizes.length; run += 1) {
      for (let i = 0; i < runSizes[run]; i += 1) {
        const content = await prisma.content.upsert({
          where: {
            externalAccountId_externalContentId: {
              externalAccountId: account.id,
              externalContentId: `dq-anomaly-post-${i}`,
            },
          },
          create: {
            userId: user.id,
            externalAccountId: account.id,
            externalContentId: `dq-anomaly-post-${i}`,
            contentType: 'image',
          },
          update: {},
        });
        await prisma.performanceMetric.create({
          data: {
            contentId: content.id,
            metricType: 'likes',
            value: 1,
            measuredAt: runDates[run],
          },
        });
      }
    }

    const [status] = await getDataQualityStatus(user.id);

    expect(status.syncCountAnomaly.status).toBe('anomaly');
    expect(status.syncCountAnomaly.lastRunContentCount).toBe(2);
    expect(status.syncCountAnomaly.historicalAverageContentCount).toBe(10);
    expect(status.gaps).toContain('sync_count_anomaly');
  });

  it('flags temporal_inconsistency when a metric was measured before its content was published', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-temporal-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
      },
    });
    const publishedAt = new Date('2026-08-10T12:00:00Z');
    const measuredBeforePublished = new Date('2026-08-10T10:00:00Z');
    const content = await prisma.content.create({
      data: {
        userId: user.id,
        externalAccountId: account.id,
        externalContentId: `dq-temporal-post-${Date.now()}`,
        contentType: 'image',
        publishedAt,
      },
    });
    await prisma.performanceMetric.create({
      data: {
        contentId: content.id,
        metricType: 'likes',
        value: 5,
        measuredAt: measuredBeforePublished,
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.temporalConsistency.violationCount).toBe(1);
    expect(status.temporalConsistency.violations[0].contentId).toBe(content.id);
    expect(status.gaps).toContain('temporal_inconsistency');
  });

  it('does not flag temporal_inconsistency for normally-ordered data', async () => {
    const user = await createUser();
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `dq-temporal-ok-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastSyncedAt: new Date(),
      },
    });
    const publishedAt = new Date('2026-08-10T12:00:00Z');
    const content = await prisma.content.create({
      data: {
        userId: user.id,
        externalAccountId: account.id,
        externalContentId: `dq-temporal-ok-post-${Date.now()}`,
        contentType: 'image',
        publishedAt,
      },
    });
    await prisma.performanceMetric.create({
      data: {
        contentId: content.id,
        metricType: 'likes',
        value: 5,
        measuredAt: new Date('2026-08-11T12:00:00Z'),
      },
    });

    const [status] = await getDataQualityStatus(user.id);

    expect(status.temporalConsistency.violationCount).toBe(0);
    expect(status.gaps).not.toContain('temporal_inconsistency');
  });
});
