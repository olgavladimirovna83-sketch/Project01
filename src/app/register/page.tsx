'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? 'Не удалось зарегистрироваться.');
      setPending(false);
      return;
    }

    const signInResult = await signIn('credentials', { email, password, redirect: false });
    setPending(false);

    if (signInResult?.error) {
      setError('Аккаунт создан, но автоматический вход не удался. Попробуйте войти отдельно.');
      return;
    }

    // Task 10.1 — новый пользователь закономерно попадает на постановку
    // целей, а не находит её случайно: без активной цели GOAL_FIRST
    // (Task 8.2) не может выбрать первичную метрику для рекомендаций.
    router.push('/goals');
    router.refresh();
  }

  return (
    <main>
      <h1>Регистрация</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          Создать аккаунт
        </button>
      </form>
    </main>
  );
}
