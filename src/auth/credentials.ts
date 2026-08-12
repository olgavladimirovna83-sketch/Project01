import { userRepository } from '@/data/repositories';
import { verifyPassword } from './password';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Основная логика Credentials provider'а, вынесена отдельно от
 * NextAuth-конфига, чтобы быть напрямую тестируемой (см.
 * tests/integration/auth-credentials.smoke.test.ts) без необходимости
 * поднимать HTTP-сервер и гонять полный Auth.js sign-in flow.
 */
export async function authenticateWithCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await userRepository.findByEmail(email);
  if (!user?.passwordHash || !user.email) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name };
}
