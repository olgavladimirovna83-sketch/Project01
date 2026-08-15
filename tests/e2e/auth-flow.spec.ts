import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 2.2 — закрывает пробел, явно оставленный в Task 2.1: полный HTTP
 * session cycle (issuance/чтение cookie-based JWT-сессии через реальный
 * /api/auth/*, не только unit-уровень authenticateWithCredentials) через
 * настоящий браузер, включая user isolation на двух независимых аккаунтах.
 *
 * Playwright-тесты выполняются в Node (не в браузере), поэтому прямой
 * доступ к prisma для очистки тестовых пользователей за собой — так же, как
 * это делают integration-тесты в tests/integration/.
 */

const createdEmails: string[] = [];
const uniqueEmail = makeUniqueEmailFactory(createdEmails);

test.afterAll(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

test.describe('registration / login / logout — full HTTP session cycle', () => {
  test('register issues a real session cookie readable by /api/me, logout invalidates it', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e-auth');
    const password = 'correct horse battery staple';

    await registerAndLogin(page, email, password);

    const me = await page.request.get('/api/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(email);

    // Task 10.1 — регистрация теперь ведёт на /goals, у которой нет своей
    // кнопки выхода (та есть только на "/", тот же принцип, что
    // /integrations/content-suggestions уже не имели её раньше).
    await page.goto('/');
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();

    const meAfterLogout = await page.request.get('/api/me');
    expect(meAfterLogout.status()).toBe(401);
  });

  test('login with existing credentials issues a working session', async ({ page }) => {
    const email = uniqueEmail('e2e-auth-login');
    const password = 'correct horse battery staple';

    await registerAndLogin(page, email, password);
    await page.goto('/');
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText(`Вы вошли как ${email}`)).toBeVisible();
    const me = await page.request.get('/api/me');
    expect(me.status()).toBe(200);
  });

  test('login rejects a wrong password and leaves /api/me unauthorized', async ({ page }) => {
    const email = uniqueEmail('e2e-auth-wrong');
    const password = 'correct horse battery staple';

    await registerAndLogin(page, email, password);
    await page.goto('/');
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill('definitely the wrong password');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    const me = await page.request.get('/api/me');
    expect(me.status()).toBe(401);
  });

  test('two independently logged-in users only ever see their own data via /api/me', async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const emailA = uniqueEmail('e2e-isolation-a');
    const emailB = uniqueEmail('e2e-isolation-b');
    const password = 'correct horse battery staple';

    await registerAndLogin(pageA, emailA, password);
    await registerAndLogin(pageB, emailB, password);

    const bodyA = await (await pageA.request.get('/api/me')).json();
    const bodyB = await (await pageB.request.get('/api/me')).json();

    expect(bodyA.email).toBe(emailA);
    expect(bodyB.email).toBe(emailB);
    expect(bodyA.id).not.toBe(bodyB.id);

    await contextA.close();
    await contextB.close();
  });
});
