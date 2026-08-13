import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import '@/integrations/bootstrap';
import { requireSessionUserId } from '@/auth/session';
import { externalAccountRepository } from '@/data/repositories';
import { INSTAGRAM_OAUTH_STATE_COOKIE, INSTAGRAM_REDIRECT_URI } from '@/integrations/config';
import { IntegrationService } from '@/integrations';

/**
 * Task 3.2/3.3/3.4 — OAuth round trip для Instagram Business Login, с
 * persistence через ExternalAccount (Task 3.3, `25_DATABASE_SCHEMA.md` §7) и
 * CSRF-проверкой `state` (Task 3.4) — сравнивается со значением, положенным
 * в cookie authorize route'ом (`src/app/api/integrations/instagram/authorize`).
 *
 * Task 3.4 — реальный product-flow, не диагностика: результат не
 * показывается как raw JSON, а редиректит на /integrations (тот же экран,
 * что показывает статус) с понятным для пользователя исходом в query.
 *
 * Требует активную сессию приложения (Auth.js) — подключение внешнего
 * аккаунта должно быть привязано к конкретному пользователю нашего
 * приложения (App Authentication ≠ Instagram Integration, но связь между
 * ними обязательна — CLAUDE.md §3.2/§4.1).
 */
function redirectToIntegrations(request: Request, params: Record<string, string>): NextResponse {
  const url = new URL('/integrations', request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorReason = url.searchParams.get('error_reason');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value;
  // state одноразовый — не переживает повторное использование независимо
  // от исхода этого запроса.
  cookieStore.delete(INSTAGRAM_OAUTH_STATE_COOKIE);

  if (error) {
    return redirectToIntegrations(request, { error: errorReason ?? error });
  }

  if (!code) {
    return redirectToIntegrations(request, { error: 'missing_code' });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectToIntegrations(request, { error: 'invalid_state' });
  }

  try {
    const tokens = await IntegrationService.exchangeCodeForTokens('instagram', {
      code,
      redirectUri: INSTAGRAM_REDIRECT_URI,
    });
    const identity = await IntegrationService.getAccountIdentity('instagram', tokens.accessToken);

    // Один пользователь может уже иметь запись для этой же платформы
    // (реконнект после expired/disconnected) — обновляем её вместо
    // создания дубля; unique(platform, externalUserId) на уровне БД не
    // спасёт от дубля по (userId, platform), если бы мы создавали вслепую.
    const existing = (await externalAccountRepository.findByUserId(userId)).find(
      (account) => account.platform === 'instagram' && account.externalUserId === identity.externalUserId,
    );

    if (existing) {
      await externalAccountRepository.update(existing.id, {
        status: 'connected',
        accessToken: tokens.accessToken,
        tokenExpiresAt: tokens.expiresAt,
      });
    } else {
      await externalAccountRepository.create({
        user: { connect: { id: userId } },
        platform: 'instagram',
        externalUserId: identity.externalUserId,
        accessToken: tokens.accessToken,
        tokenExpiresAt: tokens.expiresAt,
      });
    }

    return redirectToIntegrations(request, { connected: '1' });
  } catch {
    return redirectToIntegrations(request, { error: 'connection_failed' });
  }
}
