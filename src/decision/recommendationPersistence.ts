import type { Prisma } from '@prisma/client';
import { recommendationRepository, type RecommendationWithReasons } from '@/data/repositories';
import { CONFIDENCE_SCORE } from '@/knowledge/analyticsMemory';
import { getDecisionCandidates } from './recommendationCandidates';

/**
 * Task 8.3 — Phase 8, персистентность решения (`25_DATABASE_SCHEMA.md`
 * §26 RECOMMENDATIONS/§28 RECOMMENDATION_REASONS/§30 RECOMMENDATION_CONTEXT
 * — не §36, см. уточнение цитаты в D-0024/TASKS.md Task 8.1). Единственная
 * цель этого шага (прямое требование Olga) — закрыть цикл «решение → можно
 * объяснить и найти позже» на уже готовых Task 8.1/8.2 кандидатах, не
 * добирать оставшиеся 6 из 9 факторов CANDIDATE_SCORER (D-0024) —
 * это сознательно осталось вне scope.
 *
 * `Recommendation.goalId` — обязательный FK (не nullable в схеме с
 * Task 1.1). Это значит, что записать рекомендацию можно, только когда
 * goal fit (Task 8.2) реально выбрал цель — `reason: 'goal_matched'`.
 * Остальные честные состояния goal fit (`no_goals_defined`/
 * `no_tracked_goals`) и отсутствие кандидатных данных НЕ создают запись
 * с придуманным/пустым goalId — они возвращаются как явный некреированный
 * результат (`created: false`, тот же принцип честных состояний, что
 * `goalFit.ts`/D-0025), не тихая ошибка и не фиктивная строка.
 *
 * `decisionVersion` — первое реальное значение для этого поля, версии
 * решающей логики раньше не существовало ни в одном коде. `DECISION_VERSION`
 * ниже — простая строковая константа текущей реализации DECISION layer
 * (Task 8.1–8.3), не semver и не привязана к какой-либо внешней схеме.
 * YELLOW, зафиксировано в `DECISIONS.md` D-0026.
 *
 * `context` (§30) — JSON-снимок состояния решения. Документ перечисляет,
 * что он "может содержать": goal/relevant baseline/active patterns/
 * confidence/recent performance/skeleton version/decision version.
 * Реализовано без выдумывания данных, которых нет:
 * - goal/primaryMetric/ranking (baseline/confidence/pattern по каждому
 *   кандидату метрики) — уже посчитанные Task 8.1/8.2 структуры, без
 *   изменений;
 * - untrackedGoals — прозрачность по проигнорированным целям;
 * - decisionVersion — продублирован внутри снимка намеренно: §30 сам
 *   перечисляет "decision version" как часть контекста, снимок должен
 *   быть читаем сам по себе, не только через join к родительской строке;
 * - skeletonVersion — явно `null`. "Skeleton version" нигде в кодовой базе
 *   не имеет референта (AI/prompt слой не участвует в этом решении вовсе)
 *   — честный пробел, не выдуманное значение, как и частичное покрытие
 *   в D-0022 (Memory) до этого.
 *
 * §28 RECOMMENDATION_REASONS.weight — сознательно не заполняется:
 * числового веса причины не существует ни у одного посчитанного фактора
 * (D-0024/D-0025 — придуманный вес запрещён §40 NO FALSE PRECISION).
 * `reasonType` — из словаря, который перечисляет сам документ (pattern/
 * performance/baseline/goal/experiment/freshness/opportunity), используются
 * 'goal'/'baseline'/'pattern' и, с Task 8.4, 'freshness' (реальный пункт
 * словаря, реальные данные — `CandidateResult.freshness`). `repetitionNote`
 * (Task 8.4, §13–14) НЕ становится отдельной причиной — "repetition"
 * отсутствует в словаре reasonType, который перечисляет сам документ, а
 * изобретать новую категорию вместо буквального следования документу здесь
 * не оправдано; `repetitionNote` остаётся сигналом внутри `candidateScorer`
 * (виден в `context.ranking`), не формальной RECOMMENDATION_REASON.
 *
 * Append-only, не upsert: каждый вызов создаёт НОВУЮ строку Recommendation
 * — рекомендация это событие в конкретный момент решения (на неё потом
 * ссылается UserDecision/Outcome, §31/§34), а не текущее перезаписываемое
 * состояние. Тот же принцип, что Memory (Task 7.1) — снимок, не Pattern
 * (Task 7.2) — не upsert.
 */

export const DECISION_VERSION = 'decision-v1';

export type CreateRecommendationResult =
  | { created: true; recommendation: RecommendationWithReasons }
  | {
      created: false;
      reason: 'no_goals_defined' | 'no_tracked_goals' | 'no_candidates' | 'insufficient_data';
    };

export async function createRecommendation(userId: string): Promise<CreateRecommendationResult> {
  const { goalFit, primaryRanking } = await getDecisionCandidates(userId);

  if (goalFit.reason !== 'goal_matched' || goalFit.matchedGoal === null) {
    return { created: false, reason: goalFit.reason === 'no_goals_defined' ? 'no_goals_defined' : 'no_tracked_goals' };
  }

  if (primaryRanking === null || primaryRanking.ranking.length === 0) {
    return { created: false, reason: 'no_candidates' };
  }

  const top = primaryRanking.ranking[0];
  if (top.comparison === 'insufficient_data') {
    // Первый по рангу — insufficient_data значит ВСЕ кандидаты без данных
    // по этой метрике (insufficient_data всегда ранжируется последним,
    // candidateScorer.ts COMPARISON_RANK) — честно нечего рекомендовать.
    return { created: false, reason: 'insufficient_data' };
  }

  const { matchedGoal, primaryMetric, untrackedGoals } = goalFit;

  const reasons: Prisma.RecommendationReasonCreateWithoutRecommendationInput[] = [
    {
      reasonType: 'goal',
      description: `Goal "${matchedGoal.goalType}" (priority ${matchedGoal.priority}) selected metric "${primaryMetric}" as primary (GOAL_FIRST/GOAL_PRIORITY, §6-7)`,
      // Выбор цели — детерминированное сравнение приоритетов, не
      // вероятностная оценка — числового confidence для него нет.
      confidence: null,
    },
    {
      reasonType: 'baseline',
      description: `Candidate "${top.candidate}" vs personal baseline: ${top.label}`,
      confidence: CONFIDENCE_SCORE[top.confidence],
    },
  ];

  if (top.matchesPattern && primaryRanking.pattern !== null) {
    reasons.push({
      reasonType: 'pattern',
      description: `Confirmed pattern for "${primaryMetric}" (${primaryRanking.pattern.direction}) agrees with candidate "${top.candidate}"`,
      confidence: primaryRanking.pattern.confidence ?? null,
    });
  }

  if (top.freshness !== null) {
    reasons.push({
      reasonType: 'freshness',
      description: `Evidence behind candidate "${top.candidate}" is ${top.freshness} (§12 FRESHNESS_WEIGHT)`,
      // Категориальный бакет по возрасту данных, не вероятностная оценка —
      // тот же принцип, что 'goal' выше.
      confidence: null,
    });
  }

  // CandidateResult[] сериализуется в JSON структурно совместимо (только
  // string/number/boolean/null поля), но у Prisma.InputJsonValue строгая
  // структурная проверка на index signature — явное приведение, не обход
  // типобезопасности данных (та же форма, что уже возвращается по API).
  const context = {
    goal: matchedGoal,
    primaryMetric,
    ranking: primaryRanking.ranking,
    untrackedGoals,
    decisionVersion: DECISION_VERSION,
    skeletonVersion: null,
  } as unknown as Prisma.InputJsonValue;

  const recommendation = await recommendationRepository.createWithReasons({
    user: { connect: { id: userId } },
    goal: { connect: { id: matchedGoal.id } },
    primaryCandidate: top.candidate,
    confidence: CONFIDENCE_SCORE[top.confidence],
    decisionVersion: DECISION_VERSION,
    context,
    reasons: { create: reasons },
  });

  return { created: true, recommendation };
}
