import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { createRecommendation } from '../../src/decision/recommendationPersistence';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 9.2 — экран `/recommendations/[id]`, через реальный браузер и
 * реальную БД. Кнопка «Сгенерировать объяснение» НЕ нажимается в этом
 * тесте — она вызывает реальный `AIService` (реальный внешний API), тот же
 * принцип, что кнопка «Синхронизировать» в `integrations-instagram.spec.ts`
 * (Task 3.4) никогда не нажимается в e2e: внешние платные/сетевые вызовы не
 * запускаются автоматизированными тестами. Обработка каждого исхода
 * `explain` (включая честное сообщение при отсутствующем
 * `ANTHROPIC_API_KEY`) покрыта отдельно чистой функцией
 * (`tests/unit/explain-status-messages.test.ts`) и API-уровнем
 * (`tests/integration/decision-explanation.smoke.test.ts`, Task 9.1) — здесь
 * проверяется только сама страница: auth-gate, honest not-found, и что
 * реальная сохранённая Recommendation отображается.
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
      externalUserId: `e2e-explain-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  for (let i = 0; i < 5; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `e2e-explain-reel-${Date.now()}-${i}`,
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
        externalContentId: `e2e-explain-carousel-${Date.now()}-${i}`,
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

test.describe('Recommendation explanation screen', () => {
  test('unauthenticated visitors are prompted to log in, not shown recommendation data', async ({
    page,
  }) => {
    await page.goto('/recommendations/does-not-exist');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
  });

  test('shows "not found" for a non-existent recommendation id', async ({ page }) => {
    const email = uniqueEmail('e2e-explain-missing');
    await registerAndLogin(page, email, password);

    await page.goto('/recommendations/does-not-exist');
    await expect(page.getByText('Рекомендация не найдена.')).toBeVisible();
  });

  test("shows the same \"not found\" message for another user's recommendation — existence is not leaked", async ({
    browser,
  }) => {
    const contextOwner = await browser.newContext();
    const contextOther = await browser.newContext();
    const pageOwner = await contextOwner.newPage();
    const pageOther = await contextOther.newPage();

    const ownerEmail = uniqueEmail('e2e-explain-owner');
    const otherEmail = uniqueEmail('e2e-explain-other');
    await registerAndLogin(pageOwner, ownerEmail, password);
    await registerAndLogin(pageOther, otherEmail, password);

    const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    const recommendation = await seedRecommendationFor(owner.id);

    await pageOther.goto(`/recommendations/${recommendation.id}`);
    await expect(pageOther.getByText('Рекомендация не найдена.')).toBeVisible();
  });

  test('shows the recommended format and a button to generate an explanation for the owner', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e-explain-owner-view');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const recommendation = await seedRecommendationFor(user.id);

    await page.goto(`/recommendations/${recommendation.id}`);
    await expect(page.getByText(`Формат: ${recommendation.primaryCandidate}`)).toBeVisible();
    // Кнопка намеренно НЕ нажимается — реальный внешний AI-вызов, см. header-комментарий.
    await expect(page.getByRole('button', { name: 'Сгенерировать объяснение' })).toBeVisible();
  });
});
