import { afterAll, describe, expect, it } from 'vitest';
import { registerUser } from '../../src/auth/register';
import { prisma } from '../../src/data/prismaClient';

describe('registerUser smoke test', () => {
  const createdUserIds: string[] = [];
  const email = `register-smoke-${Date.now()}@example.test`;
  const password = 'correct horse battery staple';

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it('creates a user with a hashed (not plaintext) password', async () => {
    const user = await registerUser(email, password);
    createdUserIds.push(user.id);

    expect(user.email).toBe(email);

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe(password);
  });

  it('rejects a duplicate email', async () => {
    await expect(registerUser(email, password)).rejects.toMatchObject({ code: 'email_taken' });
  });

  it('rejects an invalid email', async () => {
    await expect(registerUser('not-an-email', password)).rejects.toMatchObject({
      code: 'invalid_email',
    });
  });

  it('rejects a too-short password', async () => {
    await expect(
      registerUser(`short-pw-${Date.now()}@example.test`, 'short'),
    ).rejects.toMatchObject({ code: 'weak_password' });
  });
});
