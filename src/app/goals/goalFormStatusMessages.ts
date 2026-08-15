/**
 * Task 10.1 — честные сообщения для каждого нестандартного исхода
 * `POST /api/goals` (Task 8.x), тот же принцип, что
 * `content-suggestions/contentSuggestionStatusMessages.ts` (Task 9.5) и
 * `recommendations/[id]/explainStatusMessages.ts` (Task 9.2). Отдельная
 * чистая функция, не логика внутри React-компонента.
 *
 * Коды ошибок — буквально то, что уже возвращает `POST /api/goals`
 * (`error: 'invalid_input' | 'unauthorized'`), не придуманы заново.
 */

export type GoalFormErrorCode = 'invalid_input' | 'unauthorized';

const MESSAGES: Record<GoalFormErrorCode, string> = {
  invalid_input: 'Выберите цель, прежде чем сохранить.',
  unauthorized: 'Сессия истекла — войдите заново, чтобы сохранить цель.',
};

export function formatGoalFormErrorMessage(code: GoalFormErrorCode): string {
  return MESSAGES[code];
}

export const UNEXPECTED_RESPONSE_MESSAGE = 'Что-то пошло не так при сохранении цели. Попробуйте ещё раз.';
