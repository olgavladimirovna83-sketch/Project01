import { NextResponse } from 'next/server';
import '@/integrations/bootstrap';
import { requireSessionUserId } from '@/auth/session';
import { INSTAGRAM_OAUTH_STATE_COOKIE, INSTAGRAM_REDIRECT_URI } from '@/integrations/config';
import { IntegrationService } from '@/integrations';

/**
 * Task 3.4 — реальная инициация подключения (заменяет throwaway-скрипт
 * генерации authorize URL из Task 3.2). Только редиректит на настоящий
 * Instagram authorize endpoint — persistence происходит в callback.
 */
export async function GET(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const state = crypto.randomUUID();
  const authorizeUrl = IntegrationService.getAuthorizationUrl('instagram', {
    redirectUri: INSTAGRAM_REDIRECT_URI,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    // Достаточно для прохождения consent screen — code от Instagram и так
    // живёт только 1 час (INSTAGRAM_API_REVIEW.md §2).
    maxAge: 10 * 60,
    path: '/',
  });
  return response;
}
