import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 3.4 — экран подключения/отключения Instagram, через реальный
 * браузер и реальную БД. Реальный Instagram consent screen нельзя пройти
 * автоматизированным тестом (та же причина, что в Task 3.2/3.3) — поэтому
 * "подключённое" состояние сеется напрямую через Prisma (в обход
 * /api/integrations/instagram/authorize), а проверяется реальный код:
 * страница статуса, кнопка "Отключить", redirect неаутентифицированных
 * запросов.
 */

const createdEmails: string[] = [];
const uniqueEmail = makeUniqueEmailFactory(createdEmails);
const password = 'correct horse battery staple';

test.afterAll(async () => {
  if (createdEmails.length > 0) {
    // onDelete: Cascade на ExternalAccount.userId — удаление user убирает и его.
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

test.describe('Instagram connect/disconnect screen', () => {
  test('unauthenticated visitors are prompted to log in, not shown account data', async ({
    page,
  }) => {
    await page.goto('/integrations');
    await expect(page.getByRole('link', { name: 'Войдите' })).toBeVisible();
  });

  test('unauthenticated authorize request redirects to /login', async ({ page }) => {
    const response = await page.request.get('/api/integrations/instagram/authorize', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/login');
  });

  test('shows "not connected" and a connect link when nothing is linked yet', async ({ page }) => {
    const email = uniqueEmail('e2e-ig-notconnected');
    await registerAndLogin(page, email, password);

    await page.goto('/integrations');
    await expect(page.getByText('Статус: не подключён')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Подключить Instagram' })).toBeVisible();
  });

  test('shows connected status and disconnecting flips it back to not connected', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e-ig-connected');
    await registerAndLogin(page, email, password);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `seeded-${Date.now()}`,
        accessToken: 'seeded-access-token',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        username: 'seeded_test_account',
      },
    });

    await page.goto('/integrations');
    await expect(page.getByText('Статус: подключён')).toBeVisible();
    // Task 3.4 addendum: username нужен именно чтобы отличить, какой из
    // нескольких связанных Instagram-аккаунтов подключён — проверяем, что
    // он реально отображается, не только что статус "подключён".
    await expect(page.getByText('Аккаунт: @seeded_test_account')).toBeVisible();

    await page.getByRole('button', { name: 'Отключить' }).click();
    await expect(page.getByText('Статус: не подключён')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Подключить Instagram' })).toBeVisible();

    const account = await prisma.externalAccount.findFirstOrThrow({ where: { userId: user.id } });
    expect(account.status).toBe('disconnected');
  });
});
