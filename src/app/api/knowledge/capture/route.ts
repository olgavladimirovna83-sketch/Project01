import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { captureAnalyticsMemory } from '@/knowledge/analyticsMemory';

const DEFAULT_PERIOD_DAYS = 30;

/**
 * Task 7.1 — в отличие от GET /api/analytics (Task 6.1, read-only), этот
 * маршрут пишет новые строки Memory — state-changing, поэтому POST.
 * `?days=N` — тот же параметр периода, что у /api/analytics.
 */
export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get('days');
  const days = daysParam ? Number(daysParam) : DEFAULT_PERIOD_DAYS;
  if (!Number.isFinite(days) || days <= 0) {
    return NextResponse.json({ error: 'invalid_days' }, { status: 400 });
  }

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await captureAnalyticsMemory(userId, { start, end });
  return NextResponse.json(result);
}
