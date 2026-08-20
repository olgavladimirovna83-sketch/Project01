import Link from 'next/link';
import { auth } from '@/auth/config';
import { recommendationRepository } from '@/data/repositories';
import { DecisionButtons } from './DecisionButtons';
import { ExplainButton } from './ExplainButton';

/**
 * Task 9.2 — простой экран для результата Task 9.1 (`generateDecisionExplanation`).
 * Читает `Recommendation` напрямую через repository (тот же паттерн, что
 * `/integrations` — server component читает данные сам, не ходит на свой же
 * API), кнопка вызывает уже существующий
 * `POST /api/decision/recommendations/[id]/explain`.
 *
 * Честные состояния: не найдена/чужая рекомендация — одно и то же сообщение
 * (тот же принцип, что API/Task 2.3 — не раскрывать существование чужого
 * ресурса). Если `ANTHROPIC_API_KEY` не настроен — это уже видно в самом
 * ответе `explain` (`status: 'provider_unavailable'`), `ExplainButton`
 * показывает это честно, не притворяется, что всё сработало.
 *
 * Task 10.5 — добавлен статус рекомендации и `DecisionButtons`
 * (Accept/Reject/Modify/Defer, §56) поверх уже существующего
 * `POST /api/decision/recommendations/[id]/decide` (Task 10.4). Это
 * первый экран, где `RecommendationStatus` вообще отображается — до этой
 * задачи поле нигде не показывалось в UI.
 */
const STATUS_LABELS: Record<string, string> = {
  generated: 'сгенерирована',
  shown: 'показана',
  accepted: 'принята',
  rejected: 'отклонена',
  modified: 'изменена',
  postponed: 'отложена',
  completed: 'завершена',
  expired: 'истекла',
};
export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return (
      <main>
        <h1>Рекомендация</h1>
        <p>
          <Link href="/login">Войдите</Link>, чтобы посмотреть рекомендацию.
        </p>
      </main>
    );
  }

  const recommendation = await recommendationRepository.findByIdWithReasons(id);

  if (!recommendation || recommendation.userId !== session.user.id) {
    return (
      <main>
        <h1>Рекомендация</h1>
        <p>Рекомендация не найдена.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Рекомендация</h1>
      <p>Формат: {recommendation.primaryCandidate}</p>
      <p>Создана: {recommendation.createdAt.toLocaleString('ru-RU')}</p>
      <p>Статус: {STATUS_LABELS[recommendation.status] ?? recommendation.status}</p>
      <DecisionButtons recommendationId={recommendation.id} />
      <ExplainButton recommendationId={recommendation.id} />
    </main>
  );
}
