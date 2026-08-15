import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { getDecisionCandidates } from '@/decision/recommendationCandidates';

/**
 * Task 8.1/8.2 — только чтение уже существующих данных (никакой
 * персистентности в Recommendation), поэтому GET, тот же принцип, что
 * /api/analytics и /api/knowledge. Ответ включает `goalFit` (Task 8.2) —
 * какая метрика первична для целей пользователя и почему, явно, если
 * целей нет или ни одна не сопоставляется с трекаемой метрикой.
 */
export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await getDecisionCandidates(userId);
  return NextResponse.json(result);
}
