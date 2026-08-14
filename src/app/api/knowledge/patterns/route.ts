import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { detectPatterns } from '@/knowledge/patternDetection';

/**
 * Task 7.2 — пишет/обновляет Pattern-записи, поэтому POST (state-changing),
 * тот же принцип, что POST /api/knowledge/capture (Task 7.1). Без периода
 * в query — Pattern работает по всей истории пользователя, не по окну
 * (в отличие от /api/analytics//api/knowledge/capture).
 */
export async function POST() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await detectPatterns(userId);
  return NextResponse.json(result);
}
