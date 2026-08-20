/**
 * Task 10.5 — честные сообщения для каждого нестандартного исхода
 * `POST /api/decision/recommendations/[id]/decide` (Task 10.4), тот же
 * принцип, что `explainStatusMessages.ts`/`goalFormStatusMessages.ts`.
 *
 * Коды — буквально то, что уже возвращает route: `not_found`
 * (несуществующая/чужая рекомендация, неразличимо) и `invalid_input`
 * (decisionType валиден, но «Изменить» отправлен без выбранного формата —
 * единственный практический случай с сервера, поскольку кнопки UI сами не
 * позволяют отправить невалидный decisionType; тот же текст используется
 * и для клиентской проверки до запроса, см. `DecisionButtons.tsx`).
 */

export type DecideErrorCode = 'not_found' | 'invalid_input';

const MESSAGES: Record<DecideErrorCode, string> = {
  not_found: 'Рекомендация не найдена — возможно, была удалена. Обновите страницу.',
  invalid_input: 'Укажите, какой формат вы выбрали вместо предложенного, прежде чем сохранить «Изменить».',
};

export function formatDecideErrorMessage(code: DecideErrorCode): string {
  return MESSAGES[code];
}

export const UNEXPECTED_RESPONSE_MESSAGE = 'Что-то пошло не так при сохранении решения. Попробуйте ещё раз.';
