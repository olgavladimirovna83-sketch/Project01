import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { getDataQualityStatus } from '@/dataQuality/dataQualityStatus';
import { checkSchemaInvariants } from '@/dataQuality/schemaInvariants';

/**
 * Task 5.1 — только чтение уже существующих данных (никаких sync-вызовов
 * к Instagram здесь), поэтому GET, в отличие от POST /api/integrations/
 * instagram/sync (Task 4.1, state-changing).
 *
 * Task 5.3 — schemaInvariantViolations на верхнем уровне ответа, не внутри
 * accounts[]: это системная проверка (уникальность на уровне всей таблицы),
 * не привязанная к конкретному ExternalAccount пользователя (см. комментарий
 * в schemaInvariants.ts). Осознанный выбор — показать её через уже
 * существующий единственный data quality endpoint, а не заводить отдельный
 * admin-only маршрут ради MVP с одним реальным пользователем; данные не
 * персональные (только агрегированные счётчики дублей по ключам), пересмотреть
 * при появлении многопользовательского режима.
 */
export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [status, schemaInvariantViolations] = await Promise.all([
    getDataQualityStatus(userId),
    checkSchemaInvariants(),
  ]);
  return NextResponse.json({ accounts: status, schemaInvariantViolations });
}
