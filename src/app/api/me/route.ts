import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { userRepository } from '@/data/repositories';

export async function GET() {
  const userId = await requireSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Никогда не доверяем данным из session claims напрямую — перечитываем
  // актуального пользователя из БД по id из сессии (resource ownership,
  // CLAUDE.md §6; 30_SECURITY_PRIVACY.md §10).
  const user = await userRepository.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
