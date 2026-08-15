/**
 * Task 9.5 — честные сообщения для каждого нестандартного исхода
 * `generateContentSuggestions` (Task 9.4), зеркально
 * `recommendations/[id]/explainStatusMessages.ts` (Task 9.2). Отдельная
 * чистая функция, не логика внутри React-компонента.
 *
 * `invalid_topic`/`no_knowledge_available` — состояния без AI-вызова
 * (Task 9.4); `provider_unavailable` — самый частый реальный исход в этом
 * окружении (нет `ANTHROPIC_API_KEY`).
 */

export type NonCompletedSuggestionStatus =
  | 'invalid_topic'
  | 'no_knowledge_available'
  | 'failed'
  | 'timeout'
  | 'provider_unavailable'
  | 'validation_failed';

const MESSAGES: Record<NonCompletedSuggestionStatus, string> = {
  invalid_topic: 'Тема не может быть пустой — опишите, о чём пост.',
  no_knowledge_available:
    'Для этой категории пока нет загруженных приёмов создания контента — генерировать не из чего.',
  provider_unavailable:
    'AI-провайдер сейчас недоступен — скорее всего, не настроен ключ API. Варианты не сгенерированы.',
  timeout: 'AI не ответил вовремя. Попробуйте ещё раз чуть позже.',
  failed: 'Не удалось сгенерировать варианты из-за сбоя AI-запроса. Попробуйте ещё раз.',
  validation_failed:
    'Ответ AI не прошёл проверку формата — варианты не показаны, чтобы не выдать недостоверный текст за настоящий результат.',
};

export function formatSuggestionStatusMessage(status: NonCompletedSuggestionStatus): string {
  return MESSAGES[status];
}

export const UNEXPECTED_RESPONSE_MESSAGE = 'Что-то пошло не так при обращении к серверу. Попробуйте ещё раз.';
