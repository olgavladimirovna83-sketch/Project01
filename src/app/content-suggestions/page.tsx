import Link from 'next/link';
import { auth } from '@/auth/config';
import { ContentSuggestionForm } from './ContentSuggestionForm';

/**
 * Task 9.5 — экран для Task 9.4, зеркально тому, как `/recommendations/[id]`
 * (Task 9.2) стал экраном для Task 9.1. Тот же auth-gate паттерн, что
 * `/integrations`/`/recommendations/[id]`. В отличие от них — не читает
 * никакой существующий ресурс по id (генерация не привязана к
 * Recommendation), поэтому нет отдельного «не найдено» состояния.
 */
export default async function ContentSuggestionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main>
        <h1>Варианты текста</h1>
        <p>
          <Link href="/login">Войдите</Link>, чтобы сгенерировать варианты текста.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Варианты текста</h1>
      <p>Сгенерировать хук/заголовок для темы поста на основе загруженных приёмов создания контента.</p>
      <ContentSuggestionForm />
    </main>
  );
}
