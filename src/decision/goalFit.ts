/**
 * Task 8.2 — Phase 8, GOAL_FIRST/GOAL_PRIORITY/FOUR_RECOMMENDATION_DIRECTIONS
 * (`21_DECISION_LOGIC.md` §6–8). §6: цель — первый фильтр. §7: у целей
 * относительный приоритет (пример: 1. followers, 2. reach, 3. saves,
 * 4. likes) — главная цель получает больший вес, остальные не
 * игнорируются, продолжают участвовать. §8: четыре направления —
 * likes/followers/saves/reach; система определяет, какое из них сейчас
 * наиболее актуально относительно целей.
 *
 * Реализовано как ВЫБОР, не как СМЕШИВАНИЕ (прямое следствие D-0024 —
 * Task 8.1 уже показал, что объединять метрики в один рейтинг без goal
 * fit значило бы придумывать вес; здесь goal fit есть, но он определяет,
 * КАКАЯ из уже существующих per-metric рейтингов (Task 8.1) является
 * первичной, не порождает новое смешанное число). Это буквальное
 * прочтение §8: "система определяет, какое из НИХ [направлений] сейчас
 * наиболее актуально" — про выбор направления, не про синтез оценки.
 *
 * Honest edge cases (прямое требование Olga — явно, не молчаливое
 * предположение):
 * - у пользователя нет ни одной активной цели → `reason: 'no_goals_defined'`,
 *   `primaryMetric: null`. Не выбирается цель "по умолчанию" — GOAL_FIRST
 *   требует цель как первый фильтр, без неё фильтровать нечем.
 * - у пользователя есть цели, но ни одна не сопоставляется с реально
 *   собираемой метрикой (`analysis/metricsAnalytics.ts` CORE_METRICS,
 *   D-0018) → `reason: 'no_tracked_goals'`, `primaryMetric: null`,
 *   `untrackedGoals` перечисляет, что было проигнорировано и почему
 *   (типичный случай — `goalType: 'followers'`: followers_gained не
 *   собирается ingestion'ом, см. D-0018 — GOAL_FIRST не может сработать
 *   для цели, для которой физически нет данных).
 *
 * Найдено при формулировке: словоупотребление документа (`saves`,
 * `21_DECISION_LOGIC.md` §7/§8) не совпадает с именем реально собираемой
 * метрики (`saved`, Instagram API, D-0018) — та же метрика, разное
 * написание, не два разных понятия. `GOAL_TYPE_TO_METRIC` ниже — явное
 * сопоставление, а не совпадение строк напрямую, чтобы такие
 * расхождения не приводили к тихому "цель не найдена".
 *
 * Направление `Goal.priority` не было установлено ни одним кодом до
 * этой задачи (первое реальное использование поля) — принято: меньшее
 * число = выше важность (ранжированный список §7 — "1. followers" —
 * первый номер, не наибольший вес). Зафиксировано как YELLOW,
 * `DECISIONS.md` D-0025.
 *
 * Task 8.3: `GoalLike`/`matchedGoal` дополнены `id` — понадобился
 * реальный `Goal.id` для обязательного `Recommendation.goalId`
 * (25_DATABASE_SCHEMA.md §26), когда goal fit перестал быть чисто
 * read-only (`recommendationPersistence.ts`). Поведение выбора не
 * изменилось, только состав возвращаемых данных.
 */

const GOAL_TYPE_TO_METRIC: Record<string, string> = {
  reach: 'reach',
  likes: 'likes',
  saves: 'saved',
  saved: 'saved',
};

export interface GoalFitResult {
  /** Метрика, выбранная как первичная (goalType из GOAL_TYPE_TO_METRIC),
   * или null, если goal fit не может быть применён — см. `reason`. */
  primaryMetric: string | null;
  reason: 'goal_matched' | 'no_goals_defined' | 'no_tracked_goals';
  matchedGoal: { id: string; goalType: string; priority: number } | null;
  /** goalType целей, которые есть у пользователя, но не сопоставляются ни
   * с одной реально собираемой метрикой — например 'followers'
   * (D-0018). Явный список, не молчаливый пропуск. */
  untrackedGoals: string[];
}

export interface GoalLike {
  /** Task 8.3 — нужен для записи Recommendation.goalId (обязательный FK,
   * 25_DATABASE_SCHEMA.md §26). До Task 8.3 goal fit был read-only и id
   * не требовался. */
  id: string;
  goalType: string;
  priority: number;
  status: string;
}

export function determineGoalFit(goals: GoalLike[], trackedMetrics: readonly string[]): GoalFitResult {
  const activeGoals = goals.filter((goal) => goal.status === 'active');

  if (activeGoals.length === 0) {
    return { primaryMetric: null, reason: 'no_goals_defined', matchedGoal: null, untrackedGoals: [] };
  }

  // Меньшее число — выше приоритет (см. комментарий модуля, D-0025).
  const sortedByPriority = [...activeGoals].sort((a, b) => a.priority - b.priority);

  const untrackedGoals: string[] = [];
  for (const goal of sortedByPriority) {
    const metric = GOAL_TYPE_TO_METRIC[goal.goalType];
    if (!metric || !trackedMetrics.includes(metric)) {
      untrackedGoals.push(goal.goalType);
      continue;
    }
    return {
      primaryMetric: metric,
      reason: 'goal_matched',
      matchedGoal: { id: goal.id, goalType: goal.goalType, priority: goal.priority },
      untrackedGoals,
    };
  }

  return { primaryMetric: null, reason: 'no_tracked_goals', matchedGoal: null, untrackedGoals };
}
