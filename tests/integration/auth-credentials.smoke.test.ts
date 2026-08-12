import { afterAll, describe, expect, it } from 'vitest';
import { authenticateWithCredentials } from '../../src/auth/credentials';
import { hashPassword } from '../../src/auth/password';
import { prisma } from '../../src/data/prismaClient';
import { userRepository } from '../../src/data/repositories';

/**
 * Task 2.1 smoke test: доказывает, что техническая основа Auth.js
 * (schema + Credentials provider logic) реально работает против живой БД —
 * "Auth.js может создать и прочитать сессию для тестового пользователя"
 * в терминах Task 2.1 означает здесь: правильный email+password проходит
 * проверку и возвращает пользователя, неправильный — нет. Полный HTTP
 * sign-in flow (cookies/JWT-сессия в браузере) — за пределами scope этой
 * задачи, см. TASKS.md.
 */
describe('auth credentials smoke test', () => {
  let createdUserId: string | undefined;
  const email = `auth-smoke-${Date.now()}@example.test`;
  const password = 'correct horse battery staple';

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } });
    }
  });

  it('creates a user with a hashed password and authenticates correctly', async () => {
    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ email, passwordHash });
    createdUserId = user.id;

    const authenticated = await authenticateWithCredentials(email, password);
    expect(authenticated?.id).toBe(user.id);
    expect(authenticated?.email).toBe(email);

    const wrongPassword = await authenticateWithCredentials(email, 'not the password');
    expect(wrongPassword).toBeNull();

    const unknownEmail = await authenticateWithCredentials('nobody@example.test', password);
    expect(unknownEmail).toBeNull();
  });
});
