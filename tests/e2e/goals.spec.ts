import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 10.1 — экран `/goals`, через реальный браузер. В отличие от
 * `/integrations`/`/content-suggestions`, кнопка здесь МОЖЕТ безопасно
 * нажиматься в e2e — `POST /api/goals` не вызывает ни платный, ни внешний
 * сервис, только пишет в собственную БД (тот же принцип, что
 * `goal-authorization.spec.ts`, который уже дёргает этот же route напрямую
 * через `page.request`).
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

test.describe('Goals screen', () => {
  test('unauthenticated visitors are prompted to log in, not shown the form', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
    await expect(page.getByLabel('Цель', { exact: true })).not.toBeVisible();
  });

  test('registration lands the new user on /goals with the empty-state message', async ({ page }) => {
    const email = uniqueEmail('e2e-goals-onboarding');
    await registerAndLogin(page, email, password);

    await expect(page).toHaveURL(/\/goals$/);
    await expect(page.getByText('Цели ещё не заданы')).toBeVisible();
  });

  test('submitting the form creates a goal and shows it in the list', async ({ page }) => {
    const email = uniqueEmail('e2e-goals-submit');
    await registerAndLogin(page, email, password);

    // exact: true — иначе Playwright матчит и label "Приоритет (0 — самая
    // важная цель...)" по подстроке "цель", strict-mode violation.
    await page.getByLabel('Цель', { exact: true }).selectOption('reach');
    await page.getByLabel(/Приоритет/).fill('0');
    await page.getByRole('button', { name: 'Добавить цель' }).click();

    await expect(page.getByText('Цель сохранена.')).toBeVisible();
    await expect(page.getByText('Охваты (reach) — приоритет 0')).toBeVisible();
  });
});
