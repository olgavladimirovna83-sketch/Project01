import Link from 'next/link';
import { auth } from '@/auth/config';
import { externalAccountRepository } from '@/data/repositories';
import { DisconnectButton } from './DisconnectButton';
import { SyncButton } from './SyncButton';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Вы отклонили запрос на доступ в Instagram.',
  missing_code: 'Instagram не вернул код авторизации. Попробуйте ещё раз.',
  invalid_state: 'Сессия авторизации устарела или недействительна. Попробуйте подключить заново.',
  connection_failed: 'Не удалось завершить подключение. Попробуйте ещё раз.',
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    return (
      <main>
        <h1>Интеграции</h1>
        <p>
          <Link href="/login">Войдите</Link>, чтобы подключить Instagram.
        </p>
      </main>
    );
  }

  const accounts = await externalAccountRepository.findByUserId(session.user.id);
  const instagram = accounts.find((account) => account.platform === 'instagram');
  const isConnected = instagram?.status === 'connected';

  return (
    <main>
      <h1>Интеграции</h1>

      {params.connected && <p role="status">Instagram успешно подключён.</p>}
      {params.error && (
        <p role="alert">{ERROR_MESSAGES[params.error] ?? 'Не удалось подключить Instagram.'}</p>
      )}

      <h2>Instagram</h2>
      {isConnected && instagram ? (
        <>
          <p>Статус: подключён</p>
          {instagram.username ? (
            <p>Аккаунт: @{instagram.username}</p>
          ) : (
            <p>Аккаунт: username недоступен (Instagram его не вернул)</p>
          )}
          <p>Дата подключения: {instagram.connectedAt.toLocaleString('ru-RU')}</p>
          <p>
            Последняя синхронизация:{' '}
            {instagram.lastSyncedAt ? instagram.lastSyncedAt.toLocaleString('ru-RU') : 'ещё не выполнялась'}
          </p>
          <SyncButton />
          <DisconnectButton />
        </>
      ) : (
        <>
          <p>Статус: не подключён</p>
          <a href="/api/integrations/instagram/authorize">Подключить Instagram</a>
        </>
      )}
    </main>
  );
}
