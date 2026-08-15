/**
 * Task 9.2 — честные, не приукрашенные сообщения для каждого исхода
 * `generateDecisionExplanation` (Task 9.1). Отдельная чистая функция от
 * `ExplainButton.tsx` (client component) — тот же принцип, что весь проект:
 * логика форматирования тестируется напрямую, без рендеринга React.
 *
 * `provider_unavailable` — самый частый исход в этом окружении (нет
 * `ANTHROPIC_API_KEY` ни локально, ни в CI, см. `TASKS.md` Task 9.1) —
 * прямое требование Olga: "явно и честно показать это состояние на
 * экране, не притворяться, что всё работает".
 */

export type NonCompletedExplainStatus = 'failed' | 'timeout' | 'provider_unavailable' | 'validation_failed';

const MESSAGES: Record<NonCompletedExplainStatus, string> = {
  provider_unavailable:
    'AI-провайдер сейчас недоступен — скорее всего, не настроен ключ API. Объяснение не сгенерировано.',
  timeout: 'AI не ответил вовремя. Попробуйте ещё раз чуть позже.',
  failed: 'Не удалось сгенерировать объяснение из-за сбоя AI-запроса. Попробуйте ещё раз.',
  validation_failed:
    'Ответ AI не прошёл проверку формата — объяснение не показано, чтобы не выдать недостоверный текст за настоящее объяснение.',
};

export function formatExplainStatusMessage(status: NonCompletedExplainStatus): string {
  return MESSAGES[status];
}

export const UNEXPECTED_RESPONSE_MESSAGE = 'Что-то пошло не так при обращении к серверу. Попробуйте ещё раз.';
