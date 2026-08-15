import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation } from '../../src/decision/recommendationPersistence';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 10.2 — экран `/recommendations`, через реальный браузер и реальную
 * БД. Ничего не нажимается здесь мимо навигации по ссылкам — сам список
 * только читает данные, ни один платный/внешний вызов тут не задействован.
 * Сидинг рекомендации — та же схема, что `recommendation-explanation.spec.ts`
 * (Task 9.2): свой ExternalAccount/Content/PerformanceMetric/Goal, затем
 * `createRecommendation`.
 */

const createdEmails: string[] = [];
const uniqueEmail = makeUniqueEmailFactory(createdEmails);
const password = 'correct horse battery staple';

test.afterAll(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

async function seedRecommendationFor(userId: string) {
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      platform: 'instagram',
      externalUserId: `e2e-list-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `e2e-list-reel-${Date.now()}-${i}`,
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
        userId,
        externalAccountId: account.id,
        externalContentId: `e2e-list-carousel-${Date.now()}-${i}`,
        contentType: 'carousel',
        publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 50, measuredAt: new Date() },
    });
  }
  await prisma.goal.create({ data: { userId, goalType: 'reach', priority: 1 } });
  const result = await createRecommendation(userId);
  if (!result.created) throw new Error('expected a Recommendation to be created for the e2e fixture');
  return result.recommendation;
}

test.describe('Recommendations list screen', () => {
  test('unauthenticated visitors are prompted to log in, not shown the list', async ({ page }) => {
    await page.goto('/recommendations');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
  });

  test('shows the empty-state message when the user has no recommendations', async ({ page }) => {
    const email = uniqueEmail('e2e-list-empty');
    await registerAndLogin(page, email, password);

    await page.goto('/recommendations');
    await expect(page.getByText('Рекомендаций пока нет.')).toBeVisible();
  });

  test('lists a seeded recommendation with a working link to its detail screen', async ({ page }) => {
    const email = uniqueEmail('e2e-list-item');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto('/recommendations');
    const link = page.getByRole('link', { name: new RegExp(recommendation.primaryCandidate) });
    await expect(link).toBeVisible();

    await link.click();
    await expect(page).toHaveURL(new RegExp(`/recommendations/${recommendation.id}$`));
    await expect(page.getByText(`Формат: ${recommendation.primaryCandidate}`)).toBeVisible();
  });
});
