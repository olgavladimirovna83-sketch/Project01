import { expect, type Page } from '@playwright/test';

// Общий для e2e-тестов auth-flow.spec.ts и goal-authorization.spec.ts helper —
// оба теста заводят реальных пользователей через /register в реальном браузере.

export function makeUniqueEmailFactory(createdEmails: string[]) {
  return function uniqueEmail(prefix: string): string {
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
    createdEmails.push(email);
    return email;
  };
}

export async function registerAndLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByText(`Вы вошли как ${email}`)).toBeVisible();
}
