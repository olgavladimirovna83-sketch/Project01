import { NextResponse } from 'next/server';
import '@/integrations/bootstrap';
import { requireSessionUserId } from '@/auth/session';
import { externalAccountRepository } from '@/data/repositories';
import { IntegrationService } from '@/integrations';

/**
 * Task 3.4 — отключение подключённого Instagram-аккаунта. Переводит запись
 * в status "disconnected", не удаляет её (30_SECURITY_PRIVACY.md §25).
 * POST, не GET — это state-changing действие, не должно триггериться
 * простой ссылкой/картинкой с внешней страницы.
 */
export async function POST() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const account = (await externalAccountRepository.findByUserId(userId)).find(
    (a) => a.platform === 'instagram' && a.status === 'connected',
  );

  if (!account) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 });
  }

  // Best-effort отзыв на стороне платформы — для Instagram сейчас no-op,
  // endpoint revocation неизвестен (INSTAGRAM_API_REVIEW.md §8, gap 1). Не
  // блокируем локальное отключение, если платформа недоступна/отклонила.
  await IntegrationService.disconnect('instagram', {
    accessToken: account.accessToken,
    obtainedAt: account.connectedAt,
    expiresAt: account.tokenExpiresAt,
  }).catch(() => undefined);

  await externalAccountRepository.update(account.id, { status: 'disconnected' });

  return NextResponse.json({ success: true });
}
