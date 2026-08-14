import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { getRankedCandidates } from '@/decision/recommendationCandidates';

/**
 * Task 8.1 — только чтение уже существующих данных (никакой персистентности
 * в Recommendation), поэтому GET, тот же принцип, что /api/analytics и
 * /api/knowledge.
 */
export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rankings = await getRankedCandidates(userId);
  return NextResponse.json({ rankings });
}
