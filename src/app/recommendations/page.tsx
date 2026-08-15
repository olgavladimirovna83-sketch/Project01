import Link from 'next/link';
import { auth } from '@/auth/config';
import { recommendationRepository } from '@/data/repositories';

/**
 * Task 10.2 — списочный экран `/recommendations`, поверх уже существующего
 * `recommendationRepository.findByUserId` (Task 8.3, тот же repository, что
 * `GET /api/decision/recommendations` уже использует). Тот же UI-паттерн,
 * что `/goals` (Task 10.1) и `/recommendations/[id]` (Task 9.2): server
 * component читает данные напрямую через repository, без отдельного fetch к
 * собственному API. Список уже отсортирован по `createdAt: 'desc'` в самом
 * repository — свежие рекомендации сверху.
 *
 * Каждая строка ведёт на уже существующий `/recommendations/[id]`, который
 * отвечает за honest not-found/ownership-check и объяснение — здесь это не
 * дублируется.
 */
export default async function RecommendationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main>
        <h1>Рекомендации</h1>
        <p>
          <Link href="/login">Войдите</Link>, чтобы посмотреть рекомендации.
        </p>
      </main>
    );
  }

  const recommendations = await recommendationRepository.findByUserId(session.user.id);

  return (
    <main>
      <h1>Рекомендации</h1>

      {recommendations.length === 0 ? (
        <p>Рекомендаций пока нет.</p>
      ) : (
        <ul>
          {recommendations.map((recommendation) => (
            <li key={recommendation.id}>
              <Link href={`/recommendations/${recommendation.id}`}>
                {recommendation.primaryCandidate} — {recommendation.createdAt.toLocaleString('ru-RU')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
