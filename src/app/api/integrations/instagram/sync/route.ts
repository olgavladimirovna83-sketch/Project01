import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { NoConnectedInstagramAccountError, syncInstagramAccount } from '@/ingestion/instagramSync';

/**
 * Task 4.1 — синхронный триггер разовой синхронизации. POST (не GET) —
 * это state-changing действие (пишет в Content/PerformanceMetric), не
 * должно срабатывать от простой ссылки.
 */
export async function POST() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const summary = await syncInstagramAccount(userId);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    if (error instanceof NoConnectedInstagramAccountError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 404 });
    }
    const e = error as Error;
    return NextResponse.json(
      { success: false, errorType: e.constructor.name, message: e.message },
      { status: 500 },
    );
  }
}
