import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { getUserKnowledge } from '@/knowledge/userKnowledge';

/**
 * Task 7.3 — только чтение уже накопленного знания (Memory/Pattern из
 * Task 7.1/7.2), поэтому GET, тот же принцип, что /api/analytics и
 * /api/data-quality. Прямой ответ на 42_IMPLEMENTATION_ROADMAP.md §39:
 * "что мы знаем об этом пользователе и почему".
 */
export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const knowledge = await getUserKnowledge(userId);
  return NextResponse.json(knowledge);
}
