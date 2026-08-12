import { expect, test } from '@playwright/test';
import { prisma } from '../../src/data/prismaClient';
import { makeUniqueEmailFactory, registerAndLogin } from './helpers/auth';

/**
 * Task 2.3 — authorization foundation: доказывает, что ownership-check
 * обобщается за пределы /api/me (Task 2.2) на произвольный ресурс. Goal —
 * простейшая существующая сущность с userId (prisma/schema.prisma).
 *
 * 30_SECURITY_PRIVACY.md §10: «content_id сам по себе не является
 * разрешением на получение content» — goal.id, известный второму
 * пользователю, не должен давать доступ к чужому goal.
 */

const createdEmails: string[] = [];
const uniqueEmail = makeUniqueEmailFactory(createdEmails);
const password = 'correct horse battery staple';

test.afterAll(async () => {
  if (createdEmails.length > 0) {
    // onDelete: Cascade на Goal.userId — удаление user убирает и его goals.
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

test.describe('Goal authorization — ownership check generalizes beyond /api/me', () => {
  test('unauthenticated request to /api/goals is rejected', async ({ page }) => {
    const response = await page.request.post('/api/goals', { data: { goalType: 'followers' } });
    expect(response.status()).toBe(401);
  });

  test('owner can create and read their own goal', async ({ page }) => {
    const email = uniqueEmail('e2e-goal-owner');
    await registerAndLogin(page, email, password);

    const created = await page.request.post('/api/goals', { data: { goalType: 'followers' } });
    expect(created.status()).toBe(201);
    const { goal } = await created.json();
    expect(goal.goalType).toBe('followers');

    const fetched = await page.request.get(`/api/goals/${goal.id}`);
    expect(fetched.status()).toBe(200);
    expect((await fetched.json()).goal.id).toBe(goal.id);
  });

  test('a different logged-in user gets 404 for someone else\'s goal, not the goal data', async ({
    browser,
  }) => {
    const contextOwner = await browser.newContext();
    const contextOther = await browser.newContext();
    const pageOwner = await contextOwner.newPage();
    const pageOther = await contextOther.newPage();

    const ownerEmail = uniqueEmail('e2e-goal-a');
    const otherEmail = uniqueEmail('e2e-goal-b');

    await registerAndLogin(pageOwner, ownerEmail, password);
    await registerAndLogin(pageOther, otherEmail, password);

    const created = await pageOwner.request.post('/api/goals', {
      data: { goalType: 'reach' },
    });
    const { goal } = await created.json();

    const otherAccess = await pageOther.request.get(`/api/goals/${goal.id}`);
    expect(otherAccess.status()).toBe(404);

    const nonExistentAccess = await pageOther.request.get('/api/goals/does-not-exist');
    expect(nonExistentAccess.status()).toBe(404);
    expect(nonExistentAccess.status()).toBe(otherAccess.status());

    await contextOwner.close();
    await contextOther.close();
  });
});
