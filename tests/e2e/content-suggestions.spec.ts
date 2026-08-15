import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 9.5 — экран `/content-suggestions`, через реальный браузер, зеркально
 * `recommendation-explanation.spec.ts` (Task 9.2). Кнопка «Сгенерировать
 * варианты» НЕ нажимается в этом тесте — реальный внешний AI-вызов, тот же
 * принцип, что «Синхронизировать» (Task 3.4)/«Сгенерировать объяснение»
 * (Task 9.2) никогда не нажимаются в e2e. Обработка каждого исхода покрыта
 * отдельно чистой функцией (`tests/unit/content-suggestion-status-messages.test.ts`)
 * и API-уровнем (`tests/integration/content-suggestion.smoke.test.ts`,
 * Task 9.4) — здесь проверяется только сама страница: auth-gate, форма
 * реально отображается для владельца сессии.
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

test.describe('Content suggestions screen', () => {
  test('unauthenticated visitors are prompted to log in, not shown the form', async ({ page }) => {
    await page.goto('/content-suggestions');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
    await expect(page.getByLabel('Тема поста')).not.toBeVisible();
  });

  test('shows the topic form and generate button for a logged-in user', async ({ page }) => {
    const email = uniqueEmail('e2e-content-suggestions');
    await registerAndLogin(page, email, password);

    await page.goto('/content-suggestions');
    await expect(page.getByLabel('Тема поста')).toBeVisible();
    // Кнопка намеренно НЕ нажимается — реальный внешний AI-вызов, см. header-комментарий.
    await expect(page.getByRole('button', { name: 'Сгенерировать варианты' })).toBeVisible();
  });
});
