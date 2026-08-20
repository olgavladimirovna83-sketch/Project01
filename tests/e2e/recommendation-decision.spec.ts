import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation } from '../../src/decision/recommendationPersistence';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 10.5 — экран `/recommendations/[id]`, UI для Accept/Reject/Modify/
 * Defer (§56) поверх `POST /api/decision/recommendations/[id]/decide`
 * (Task 10.4). В отличие от «Сгенерировать объяснение» (реальный внешний
 * AI-вызов, никогда не нажимается в e2e), кнопки решения безопасны —
 * `decide` не вызывает ни платный, ни внешний сервис, только пишет в
 * собственную БД (тот же принцип, что кнопка создания цели,
 * `goals.spec.ts`, Task 10.1).
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
      externalUserId: `e2e-decide-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `e2e-decide-reel-${Date.now()}-${i}`,
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
        externalContentId: `e2e-decide-carousel-${Date.now()}-${i}`,
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

test.describe('Recommendation decision buttons', () => {
  test('unauthenticated visitors are prompted to log in, not shown decision buttons', async ({ page }) => {
    await page.goto('/recommendations/does-not-exist');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Принять' })).not.toBeVisible();
  });

  test('owner sees the default status and all four decision buttons', async ({ page }) => {
    const email = uniqueEmail('e2e-decide-default');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto(`/recommendations/${recommendation.id}`);
    await expect(page.getByText('Статус: сгенерирована')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Принять' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отклонить' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Изменить' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отложить' })).toBeVisible();
  });

  test('accepting a recommendation updates the status and shows a success message', async ({ page }) => {
    const email = uniqueEmail('e2e-decide-accept');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto(`/recommendations/${recommendation.id}`);
    await page.getByRole('button', { name: 'Принять' }).click();

    await expect(page.getByText('Решение сохранено: Принять.')).toBeVisible();
    await expect(page.getByText('Статус: принята')).toBeVisible();
  });

  test('clicking "Изменить" without a candidate shows a validation message and does not change status', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e-decide-modify-empty');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto(`/recommendations/${recommendation.id}`);
    await page.getByRole('button', { name: 'Изменить' }).click();

    await expect(page.getByText('Укажите, какой формат вы выбрали')).toBeVisible();
    await expect(page.getByText('Статус: сгенерирована')).toBeVisible();
  });

  test('modifying with a selected candidate updates the status to "изменена"', async ({ page }) => {
    const email = uniqueEmail('e2e-decide-modify');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto(`/recommendations/${recommendation.id}`);
    await page.getByLabel('Другой формат вместо предложенного').fill('carousel');
    await page.getByRole('button', { name: 'Изменить' }).click();

    await expect(page.getByText('Решение сохранено: Изменить.')).toBeVisible();
    await expect(page.getByText('Статус: изменена')).toBeVisible();
  });

  test('deferring then accepting is append-only — final status reflects the latest decision', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e-decide-append-only');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto(`/recommendations/${recommendation.id}`);
    await page.getByRole('button', { name: 'Отложить' }).click();
    await expect(page.getByText('Статус: отложена')).toBeVisible();

    await page.getByRole('button', { name: 'Принять' }).click();
    await expect(page.getByText('Статус: принята')).toBeVisible();

    const decisions = await prisma.userDecision.findMany({
      where: { recommendationId: recommendation.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(decisions.map((d) => d.decisionType)).toEqual(['deferred', 'accepted']);
  });
});
