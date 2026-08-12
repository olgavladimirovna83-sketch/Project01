import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { goalRepository } from '@/data/repositories';

export async function POST(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const goalType = body?.goalType;
  if (typeof goalType !== 'string' || goalType.trim() === '') {
    return NextResponse.json(
      { error: 'invalid_input', message: 'goalType обязателен.' },
      { status: 400 },
    );
  }

  const priority = typeof body?.priority === 'number' ? body.priority : undefined;
  const status = typeof body?.status === 'string' ? body.status : undefined;

  // userId всегда берётся из сессии, никогда из тела запроса — сам этот
  // факт и есть authorization control для create (30_SECURITY_PRIVACY.md §9).
  const goal = await goalRepository.create({
    goalType,
    ...(priority !== undefined ? { priority } : {}),
    ...(status !== undefined ? { status } : {}),
    user: { connect: { id: userId } },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
