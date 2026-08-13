import { NextResponse } from 'next/server';
import '@/integrations/bootstrap';
import { IntegrationService } from '@/integrations';

/**
 * Task 3.2 — диагностический round-trip для проверки exchangeCodeForTokens
 * через реальный browser OAuth flow (не через ручной "Generate Token" в
 * Meta App Dashboard). redirect_uri здесь и в скрипте генерации authorize
 * URL должны совпадать буквально — это требование OAuth, не опечатка.
 *
 * Это не production connect-flow: нет persistence (ExternalAccount ещё не
 * существует, Data-layer задача, следующий шаг), только показ результата
 * обмена для проверки самого механизма.
 */
const REDIRECT_URI = 'https://localhost:3000/api/integrations/instagram/callback';

export async function GET(request: Request) {
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

    return NextResponse.json({
      success: true,
      // Не отдаём токен целиком даже в локальный диагностический ответ —
      // это реальный credential.
      accessTokenPreview: `${tokens.accessToken.slice(0, 12)}...`,
      obtainedAt: tokens.obtainedAt.toISOString(),
      expiresAt: tokens.expiresAt.toISOString(),
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ success: false, errorType: e.constructor.name, message: e.message }, { status: 500 });
  }
}
