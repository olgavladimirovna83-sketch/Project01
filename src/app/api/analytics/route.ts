import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { getUserAnalytics } from '@/analysis/accountAnalytics';

const DEFAULT_PERIOD_DAYS = 30;

/**
 * Task 6.1 — только чтение уже существующих данных, поэтому GET, тот же
 * принцип, что GET /api/data-quality (Task 5.1). `?days=N` — необязательный
 * период в днях назад от текущего момента, по умолчанию 30.
 */
export async function GET(request: NextRequest) {
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

  const analytics = await getUserAnalytics(userId, { start, end });
  return NextResponse.json({ accounts: analytics });
}
