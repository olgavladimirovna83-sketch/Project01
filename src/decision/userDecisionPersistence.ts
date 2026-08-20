import type { RecommendationStatus, UserDecision, UserDecisionType } from '@prisma/client';
import { recommendationRepository, userDecisionRepository } from '@/data/repositories';

/**
 * Task 10.4 — первое реальное использование `UserDecision` (модель и
 * `UserDecisionType` — с Task 1.1, `userDecisionRepository` — с Task 1.2;
 * ни разу не вызывались никаким domain-кодом до этого, та же ситуация, в
 * которой `Memory`/`Pattern` были до Task 7.1/7.2). `42_IMPLEMENTATION_ROADMAP.md`
 * §56 USER DECISION UI (Accept/Reject/Modify/Defer) — эта задача сознательно
 * ограничена backend-концепцией персистентности, без UI (прямое указание
 * Olga, «начни с backend»). `25_DATABASE_SCHEMA.md` §31 USER_DECISIONS уже
 * буквально совпадает с существующей моделью — новых полей/миграции не
 * требуется.
 *
 * **Status-mapping decisionType → RecommendationStatus** — до этой задачи
 * `Recommendation.status` не менялся НИ РАЗУ ни одним кодом (стоял на
 * дефолте `generated` с Task 8.3). Прямые соответствия для 4 из 5 типов:
 * `accepted`/`rejected`/`modified` совпадают буквально по имени;
 * `deferred` → `postponed` (§45_PRODUCT_DECISION_FRAMEWORK.md §9/
 * §33_UX_USER_FLOWS.md §19 — «отложено», не отклонено, тот же смысл, что
 * уже существующий статус `postponed`). Пятый тип, `alternative_selected`,
 * не имеет отдельного статуса в `RecommendationStatus` — честный выбор
 * (не изобретать новое значение enum без запроса Olga): маппится на
 * `modified`, как ближайшее по смыслу существующее состояние («пользователь
 * выбрал не главный кандидат»). YELLOW, зафиксировано в `DECISIONS.md`
 * D-0034.
 *
 * **`selectedCandidate` обязателен для `modified`/`alternative_selected`**
 * (`27_API_CONTRACTS.md` §31 — оба типа по смыслу описывают, ЧТО выбрал
 * пользователь вместо главного кандидата; без этого поля решение
 * неполно) — честный `invalid_input`, не тихая запись с `null`.
 *
 * **Append-only, не upsert** — тот же принцип, что `Recommendation`
 * (Task 8.3): каждый вызов создаёт НОВУЮ строку `UserDecision`, не
 * перезаписывает предыдущую. `Recommendation.status` при этом всегда
 * отражает САМОЕ ПОСЛЕДНЕЕ решение — `48_...` §48 «одна recommendation
 * может иметь одно основное решение», прочитано как «текущее», не
 * «единственное когда-либо». Побочный эффект append-only дизайна:
 * `22_DATA_MODEL.md`/`25_DATABASE_SCHEMA.md` §32 USER_DECISION_HISTORY
 * («история изменения решения») уже физически сохраняется — старые
 * строки не удаляются и не перезаписываются — но отдельного read-эндпоинта
 * для истории эта задача не строит (не запрошено, естественный кандидат
 * на будущее).
 *
 * **Явно не входит**: state-machine ограничения (например запрет решать
 * повторно уже `completed`/`expired` рекомендацию) — не запрошено, не
 * задокументировано ни в одном doc как обязательное правило; `Action`/
 * `Outcome`-сущность (§28/§33 из `18_DATA_MODEL.md`/`25_DATABASE_SCHEMA.md`
 * — «что произошло после решения») — отдельная, ещё не смоделированная в
 * схеме сущность, не то же самое, что `UserDecision` (docs §34 EVENT_SYSTEM
 * прямо предупреждают: decision ≠ objective performance result).
 */

const RECOMMENDATION_STATUS_BY_DECISION_TYPE: Record<UserDecisionType, RecommendationStatus> = {
  accepted: 'accepted',
  rejected: 'rejected',
  modified: 'modified',
  deferred: 'postponed',
  // YELLOW, D-0034 — RecommendationStatus не различает "modified" от
  // "alternative_selected"; ближайшее честное существующее состояние.
  alternative_selected: 'modified',
};

const CANDIDATE_REQUIRED_DECISION_TYPES: ReadonlySet<UserDecisionType> = new Set([
  'modified',
  'alternative_selected',
]);

export interface RecordUserDecisionInput {
  decisionType: UserDecisionType;
  selectedCandidate?: string;
  comment?: string;
}

export type RecordUserDecisionResult =
  | { recorded: true; decision: UserDecision }
  | { recorded: false; reason: 'not_found' }
  | { recorded: false; reason: 'invalid_input'; message: string };

export async function recordUserDecision(
  recommendationId: string,
  userId: string,
  input: RecordUserDecisionInput,
): Promise<RecordUserDecisionResult> {
  const recommendation = await recommendationRepository.findById(recommendationId);
  // "Не найдена" и "принадлежит другому пользователю" неразличимы —
  // тот же privacy-by-design принцип, что везде в проекте (не палит
  // существование чужой рекомендации).
  if (!recommendation || recommendation.userId !== userId) {
    return { recorded: false, reason: 'not_found' };
  }

  if (CANDIDATE_REQUIRED_DECISION_TYPES.has(input.decisionType) && !input.selectedCandidate) {
    return {
      recorded: false,
      reason: 'invalid_input',
      message: `decisionType "${input.decisionType}" requires selectedCandidate`,
    };
  }

  const decision = await userDecisionRepository.create({
    recommendation: { connect: { id: recommendationId } },
    user: { connect: { id: userId } },
    decisionType: input.decisionType,
    selectedCandidate: input.selectedCandidate ?? null,
    comment: input.comment ?? null,
  });

  await recommendationRepository.update(recommendationId, {
    status: RECOMMENDATION_STATUS_BY_DECISION_TYPE[input.decisionType],
  });

  return { recorded: true, decision };
}

export { RECOMMENDATION_STATUS_BY_DECISION_TYPE };
