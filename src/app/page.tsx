import Link from 'next/link';
import { auth } from '@/auth/config';
import { LogoutButton } from './_components/LogoutButton';

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <h1>Project Bootstrap</h1>
      <p>Phase 0 — foundation. UI появится по мере реализации слоёв (см. TASKS.md).</p>
      {session?.user ? (
        <p>
          Вы вошли как {session.user.email}. <Link href="/goals">Цели</Link> ·{' '}
          <Link href="/insights">Инсайты</Link> ·{' '}
          <Link href="/recommendations">Рекомендации</Link> ·{' '}
          <Link href="/integrations">Интеграции</Link>. <LogoutButton />
        </p>
      ) : (
        <p>
          <Link href="/login">Войти</Link> · <Link href="/register">Зарегистрироваться</Link>
        </p>
      )}
    </main>
  );
}
