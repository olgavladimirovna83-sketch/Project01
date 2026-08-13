import { NextResponse } from 'next/server';
import '@/integrations/bootstrap';
import { requireSessionUserId } from '@/auth/session';
import { externalAccountRepository } from '@/data/repositories';
import { IntegrationService } from '@/integrations';

/**
 * Task 3.2/3.3 — OAuth round trip для Instagram Business Login, теперь с
 * persistence через ExternalAccount (Task 3.3, `25_DATABASE_SCHEMA.md` §7).
 * redirect_uri здесь и в скрипте генерации authorize URL должны совпадать
 * буквально — это требование OAuth, не опечатка.
 *
 * Требует активную сессию приложения (Auth.js) — подключение внешнего
 * аккаунта должно быть привязано к конкретному пользователю нашего
 * приложения, иначе ExternalAccount.userId сохранять не к чему
 * (App Authentication ≠ Instagram Integration, но связь между ними
 * обязательна — CLAUDE.md §3.2/§4.1).
 */
const REDIRECT_URI = 'https://localhost:3000/api/integrations/instagram/callback';

export async function GET(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorReason = url.searchParams.get('error_reason');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    return NextResponse.json({ error, errorReason, errorDescription }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'missing_code' }, { status: 400 });
  }

  try {
    const tokens = await IntegrationService.exchangeCodeForTokens('instagram', {
      code,
      redirectUri: REDIRECT_URI,
    });
    const identity = await IntegrationService.getAccountIdentity('instagram', tokens.accessToken);

    // Один пользователь может уже иметь запись для этой же платформы
    // (реконнект после expired/disconnected) — обновляем её вместо
    // создания дубля; unique(platform, externalUserId) на уровне БД не
    // спасёт от дубля по (userId, platform), если бы мы создавали вслепую.
    const existing = (await externalAccountRepository.findByUserId(userId)).find(
      (account) => account.platform === 'instagram' && account.externalUserId === identity.externalUserId,
    );

    const account = existing
      ? await externalAccountRepository.update(existing.id, {
          status: 'connected',
          accessToken: tokens.accessToken,
          tokenExpiresAt: tokens.expiresAt,
        })
      : await externalAccountRepository.create({
          user: { connect: { id: userId } },
          platform: 'instagram',
          externalUserId: identity.externalUserId,
          accessToken: tokens.accessToken,
          tokenExpiresAt: tokens.expiresAt,
        });

    return NextResponse.json({
      success: true,
      created: !existing,
      externalAccountId: account.id,
      username: identity.username,
      status: account.status,
      connectedAt: account.connectedAt.toISOString(),
      expiresAt: account.tokenExpiresAt.toISOString(),
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json(
      { success: false, errorType: e.constructor.name, message: e.message },
      { status: 500 },
    );
  }
}
