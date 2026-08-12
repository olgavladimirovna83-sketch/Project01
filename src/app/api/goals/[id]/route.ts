import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { goalRepository } from '@/data/repositories';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const goal = await goalRepository.findById(id);

  // Не существует и «существует, но чужой» отвечают одинаково — иначе сам
  // код ответа раскрывает существование чужого ресурса
  // (30_SECURITY_PRIVACY.md §10: «content_id сам по себе не является
  // разрешением на получение content»).
  if (!goal || goal.userId !== userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ goal });
}
