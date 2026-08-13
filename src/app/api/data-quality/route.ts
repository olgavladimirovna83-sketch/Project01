import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { getDataQualityStatus } from '@/dataQuality/dataQualityStatus';

/**
 * Task 5.1 — только чтение уже существующих данных (никаких sync-вызовов
 * к Instagram здесь), поэтому GET, в отличие от POST /api/integrations/
 * instagram/sync (Task 4.1, state-changing).
 */
export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const status = await getDataQualityStatus(userId);
  return NextResponse.json({ accounts: status });
}
