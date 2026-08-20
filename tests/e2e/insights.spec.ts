import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 10.3 — экран `/insights` (`42_IMPLEMENTATION_ROADMAP.md` §54 INSIGHT
 * VIEW), через реальный браузер и реальную БД. Ничего не нажимается —
 * экран только читает уже существующие `getUserAnalytics`/`getUserKnowledge`
 * (Task 6.1/6.2/7.3), никаких платных/внешних вызовов.
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

async function seedAnalyticsAndPatternFor(userId: string) {
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      platform: 'instagram',
      externalUserId: `e2e-insights-${Date.now()}-${Math.random()}`,
      accessToken: 'irrelevant',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  // Личная норма (baseline) считается по ВСЕЙ истории (personalBaseline.ts),
  // а сравнение — только с публикациями за последние 30 дней (период
  // /insights). Чтобы период реально вышел "above" нормы, а не совпал с
  // ней, часть публикаций сознательно старше периода (60+ дней назад,
  // низкий reach) — тянет личную норму вниз, не попадая в сам период.
  for (let i = 0; i < 15; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `e2e-insights-reel-${Date.now()}-${i}`,
        contentType: 'reel',
        publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 500, measuredAt: new Date() },
    });
  }
  for (let i = 0; i < 15; i += 1) {
    const content = await prisma.content.create({
      data: {
        userId,
        externalAccountId: account.id,
        externalContentId: `e2e-insights-old-reel-${Date.now()}-${i}`,
        contentType: 'reel',
        publishedAt: new Date(Date.now() - (60 + i) * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.performanceMetric.create({
      data: { contentId: content.id, metricType: 'reach', value: 100, measuredAt: new Date() },
    });
  }

  const pattern = await prisma.pattern.create({
    data: {
      userId,
      patternType: 'reach',
      description: 'reach: 12 из 15 публикаций (80%) выше личной нормы',
      direction: 'positive',
      confidence: 0.8,
      status: 'confirmed',
    },
  });

  return { account, pattern };
}

test.describe('Insights screen', () => {
  test('unauthenticated visitors are prompted to log in, not shown insights', async ({ page }) => {
    await page.goto('/insights');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
  });

  test('shows the empty-state message when the user has no connected accounts', async ({ page }) => {
    const email = uniqueEmail('e2e-insights-empty');
    await registerAndLogin(page, email, password);

    await page.goto('/insights');
    await expect(page.getByText('Нет подключённых аккаунтов')).toBeVisible();
    await expect(page.getByRole('link', { name: 'подключите Instagram' })).toBeVisible();
  });

  test('shows what happened, why it matters, evidence and confidence for a seeded account', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e-insights-data');
    await registerAndLogin(page, email, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const { pattern } = await seedAnalyticsAndPatternFor(user.id);

    await page.goto('/insights');
    await expect(page.getByRole('heading', { name: 'Охваты (reach)' })).toBeVisible();
    await expect(page.getByText('среднее 500 за 15 публикаций')).toBeVisible();
    // Полный текст параграфа, не голое "выше личной нормы" — та же
    // подстрока встречается и в description сидированного Pattern ниже,
    // strict-mode violation иначе.
    await expect(page.getByText('Почему это важно: выше личной нормы')).toBeVisible();
    await expect(page.getByText(pattern.description)).toBeVisible();
    await expect(page.getByText('высокая уверенность')).toBeVisible();
  });
});
