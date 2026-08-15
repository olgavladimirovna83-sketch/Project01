import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation } from '../../src/decision/recommendationPersistence';
import { generateDecisionExplanation } from '../../src/ai/decisionExplanation';

const hasCredentials = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Живой smoke-тест против настоящего Anthropic API — не мок, не фиктивный
 * `generate`. Пропускается, если ANTHROPIC_API_KEY не задан — тот же
 * принцип, что Instagram (Task 3.2, `instagram-live.smoke.test.ts`):
 * сознательно не требует реальных AI-секретов в CI/dev по умолчанию.
 * Стоит реальных денег/API quota при каждом запуске — намеренно не входит
 * в обычный `npm test`, только когда ключ явно присутствует.
 */
describe.skipIf(!hasCredentials)('decisionExplanation — live smoke test', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it(
    'generates a real, schema-valid explanation from the real Anthropic API for a real Recommendation',
    async () => {
      const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
      createdUserIds.push(user.id);
      const account = await prisma.externalAccount.create({
        data: {
          userId: user.id,
          platform: 'instagram',
          externalUserId: `explain-live-${Date.now()}`,
          accessToken: 'irrelevant',
          tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      });
      for (let i = 0; i < 5; i += 1) {
        const content = await prisma.content.create({
          data: {
            userId: user.id,
            externalAccountId: account.id,
            externalContentId: `explain-live-reel-${Date.now()}-${i}`,
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
            userId: user.id,
            externalAccountId: account.id,
            externalContentId: `explain-live-carousel-${Date.now()}-${i}`,
            contentType: 'carousel',
            publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          },
        });
        await prisma.performanceMetric.create({
          data: { contentId: content.id, metricType: 'reach', value: 50, measuredAt: new Date() },
        });
      }
      await prisma.goal.create({ data: { userId: user.id, goalType: 'reach', priority: 1 } });
      const created = await createRecommendation(user.id);
      if (!created.created) throw new Error('expected a Recommendation to be created for the live test fixture');

      const result = await generateDecisionExplanation(created.recommendation.id, user.id);

      // eslint-disable-next-line no-console
      console.log('[Task 9.1] real Anthropic explanation result:', JSON.stringify(result, null, 2));

      expect(result.status).toBe('completed');
      if (result.status !== 'completed') throw new Error('expected completed');
      expect(result.explanation.whyNow.length).toBeGreaterThan(0);
      expect(result.explanation.evidence.length).toBeGreaterThan(0);
      expect(result.explanation.expectedBenefit.length).toBeGreaterThan(0);
      expect(result.explanation.uncertainty.length).toBeGreaterThan(0);

      const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
      expect(aiRun?.provider).toBe('anthropic');
      expect(aiRun?.status).toBe('completed');
      expect(aiRun?.inputTokens).toBeGreaterThan(0);
      expect(aiRun?.outputTokens).toBeGreaterThan(0);
    },
    30000,
  );
});
