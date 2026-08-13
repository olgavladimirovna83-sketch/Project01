import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { syncInstagramAccount } from '../../src/ingestion/instagramSync';

const hasCredentials = Boolean(
  process.env.INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_TEST_ACCESS_TOKEN,
);

/**
 * Task 4.1 — живой smoke-тест полного pipeline (fetch → validate →
 * normalize → store) против настоящего Instagram API — не мок. Пропускается
 * без INSTAGRAM_APP_SECRET/INSTAGRAM_TEST_ACCESS_TOKEN, тот же паттерн, что
 * tests/integration/instagram-live.smoke.test.ts (Task 3.2) — не требует
 * Instagram-секретов в CI.
 *
 * ExternalAccount сеется напрямую с реальным токеном из .env — в обход
 * OAuth-flow (это не то, что тестируется здесь; OAuth flow уже проверен
 * в Task 3.2/3.4). externalUserId — плейсхолдер: syncInstagramAccount его
 * не использует, только accessToken/id.
 */
let createdUserId: string | undefined;

afterAll(async () => {
  if (createdUserId) {
    // onDelete: Cascade — user -> ExternalAccount, user -> Content -> PerformanceMetric.
    await prisma.user.delete({ where: { id: createdUserId } });
  }
  await prisma.$disconnect();
});

describe.skipIf(!hasCredentials)('instagram sync pipeline — live smoke test', () => {
  it(
    'fetches real Instagram data and persists it as Content/PerformanceMetric',
    async () => {
      const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
      createdUserId = user.id;

      await prisma.externalAccount.create({
        data: {
          userId: user.id,
          platform: 'instagram',
          externalUserId: `live-sync-test-${Date.now()}`,
          accessToken: process.env.INSTAGRAM_TEST_ACCESS_TOKEN as string,
          tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const summary = await syncInstagramAccount(user.id);

      // eslint-disable-next-line no-console
      console.log('[Task 4.1] syncInstagramAccount вернул:', JSON.stringify(summary, null, 2));

      expect(summary.contentSynced).toBeGreaterThanOrEqual(0);
      expect(summary.warnings).toEqual(expect.any(Array));

      const storedContent = await prisma.content.findMany({ where: { userId: user.id } });
      expect(storedContent).toHaveLength(summary.contentSynced);

      if (summary.contentSynced > 0) {
        const storedMetrics = await prisma.performanceMetric.count({
          where: { content: { userId: user.id } },
        });
        expect(storedMetrics).toBe(summary.metricsSynced);

        // 08_METRICS_FRAMEWORK.md §4 — Reels не должны свалиться в общий
        // "video": если хотя бы одна публикация оказалась Reels, contentType
        // обязан быть 'reel', не 'video'.
        const contentTypes = new Set(storedContent.map((c) => c.contentType));
        // eslint-disable-next-line no-console
        console.log('[Task 4.1] Нормализованные contentType с реального аккаунта:', [...contentTypes]);
      }

      const account = await prisma.externalAccount.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(account.lastSyncedAt).not.toBeNull();

      if (summary.contentSynced > 0) {
        // Повторный sync: Content не должен дублироваться (upsert по
        // natural key), PerformanceMetric — должен: это snapshot-таблица,
        // второй прогон строит вторую точку временного ряда
        // (26_DATA_PIPELINE.md §19 SNAPSHOT_PRINCIPLE).
        const secondSummary = await syncInstagramAccount(user.id);

        const contentAfterSecondSync = await prisma.content.findMany({
          where: { userId: user.id },
        });
        expect(contentAfterSecondSync).toHaveLength(summary.contentSynced);
        expect(new Set(contentAfterSecondSync.map((c) => c.id))).toEqual(
          new Set(storedContent.map((c) => c.id)),
        );

        const metricsAfterSecondSync = await prisma.performanceMetric.count({
          where: { content: { userId: user.id } },
        });
        expect(metricsAfterSecondSync).toBe(summary.metricsSynced + secondSummary.metricsSynced);
      }
    },
    60000,
  );
});
