import Link from 'next/link';
import { auth } from '@/auth/config';
import { goalRepository } from '@/data/repositories';
import { GoalForm } from './GoalForm';

const GOAL_TYPE_LABELS: Record<string, string> = {
  reach: 'Охваты (reach)',
  likes: 'Лайки (likes)',
  saved: 'Сохранения (saved)',
};

/**
 * Task 10.1 — первый экран Phase 10 (Onboarding), сознательно блокирующий:
 * без активной цели `determineGoalFit` (Task 8.2) честно отвечает
 * `no_goals_defined`, и вся цепочка Recommendation/Decision ниже не
 * работает содержательно. Тот же UI-паттерн, что `/integrations`
 * (Task 3.4) — server component читает данные напрямую через repository
 * (`goalRepository.findByUserId`), без отдельного GET-роута для списка
 * (тот не существовал и не нужен для рендера — `POST /api/goals`,
 * который форма и вызывает, уже есть, Task 8.x).
 *
 * Явно не входит (за пределами простой формы, которую попросила Olga):
 * редактирование/удаление существующих целей — `goalRepository`/API
 * пока не поддерживают update/delete через HTTP; повторный выбор уже
 * добавленного типа цели создаст вторую активную запись того же
 * `goalType` — `determineGoalFit` возьмёт ту, что с меньшим `priority`,
 * вторая останется безвредной, но лишней записью. Оба ограничения —
 * естественные кандидаты на будущий шаг (полноценное управление целями),
 * не на этот.
 */
export default async function GoalsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main>
        <h1>Цели</h1>
        <p>
          <Link href="/login">Войдите</Link>, чтобы задать цели.
        </p>
      </main>
    );
  }

  const goals = await goalRepository.findByUserId(session.user.id);
  const activeGoals = goals
    .filter((goal) => goal.status === 'active')
    .sort((a, b) => a.priority - b.priority);

  return (
    <main>
      <h1>Цели</h1>
      <p>
        Цель определяет, какую метрику система в первую очередь учитывает при построении
        рекомендаций. Чем меньше число приоритета, тем важнее цель.
      </p>

      {activeGoals.length === 0 ? (
        <p>Цели ещё не заданы — без хотя бы одной рекомендации не будут учитывать ваши приоритеты.</p>
      ) : (
        <ul>
          {activeGoals.map((goal) => (
            <li key={goal.id}>
              {GOAL_TYPE_LABELS[goal.goalType] ?? goal.goalType} — приоритет {goal.priority}
            </li>
          ))}
        </ul>
      )}

      <GoalForm nextPriority={activeGoals.length} />
    </main>
  );
}
