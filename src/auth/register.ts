import { userRepository } from '@/data/repositories';
import { hashPassword } from './password';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegistrationErrorCode = 'invalid_email' | 'weak_password' | 'email_taken';

export class RegistrationError extends Error {
  code: RegistrationErrorCode;

  constructor(code: RegistrationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface RegisteredUser {
  id: string;
  email: string;
  name: string | null;
}

// Пред-проверка на занятый email — читаемая ошибка для обычного случая, не
// защита от гонки: единственная реальная гарантия уникальности — unique
// constraint на User.email в prisma/schema.prisma.
export async function registerUser(email: string, password: string): Promise<RegisteredUser> {
  if (!EMAIL_RE.test(email)) {
    throw new RegistrationError('invalid_email', 'Некорректный email.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new RegistrationError(
      'weak_password',
      `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`,
    );
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new RegistrationError('email_taken', 'Этот email уже зарегистрирован.');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ email, passwordHash });

  return { id: user.id, email: user.email as string, name: user.name };
}
