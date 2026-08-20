'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  formatDecideErrorMessage,
  UNEXPECTED_RESPONSE_MESSAGE,
  type DecideErrorCode,
} from './decideStatusMessages';

/**
 * Task 10.5 — UI поверх уже существующего `POST /api/decision/
 * recommendations/[id]/decide` (Task 10.4). Тот же паттерн, что
 * `ExplainButton.tsx`/`GoalForm.tsx`: client component, `fetch` +
 * `router.refresh()` на успехе, чтобы server component `page.tsx`
 * перечитал `Recommendation.status` из БД.
 *
 * §56 называет ровно четыре действия — Accept/Reject/Modify/Defer.
 * Backend поддерживает пятый `UserDecisionType` (`alternative_selected`),
 * но §56 его не требует — эта задача сознательно не добавляет для него
 * кнопку (не запрошено, не в спецификации экрана).
 *
 * «Изменить» — единственное действие, требующее `selectedCandidate`
 * (backend honest `invalid_input` без него, `userDecisionPersistence.ts`
 * D-0034). Проверка непустого поля — на клиенте до запроса (не тратить
 * round trip на заведомо известный исход) и всё равно обработана как
 * честный ответ сервера, если бы клиентская проверка была обойдена.
 *
 * Backend — append-only (D-0026/D-0034): решать можно повторно, каждое
 * новое решение — новая строка, `Recommendation.status` отражает
 * последнее. UI не запрещает повторное решение — то же самое отсутствие
 * искусственных state-machine ограничений, что зафиксировано в D-0034.
 */

type DecisionType = 'accepted' | 'rejected' | 'modified' | 'deferred';

const DECISION_LABELS: Record<DecisionType, string> = {
  accepted: 'Принять',
  rejected: 'Отклонить',
  modified: 'Изменить',
  deferred: 'Отложить',
};

export function DecisionButtons({ recommendationId }: { recommendationId: string }) {
  const router = useRouter();
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [pending, setPending] = useState<DecisionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DecisionType | null>(null);

  async function decide(decisionType: DecisionType) {
    setError(null);
    setSuccess(null);

    if (decisionType === 'modified' && selectedCandidate.trim() === '') {
      setError(formatDecideErrorMessage('invalid_input'));
      return;
    }

    setPending(decisionType);
    try {
      const response = await fetch(`/api/decision/recommendations/${recommendationId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          decisionType === 'modified'
            ? { decisionType, selectedCandidate: selectedCandidate.trim() }
            : { decisionType },
        ),
      });

      if (response.ok) {
        setSuccess(decisionType);
        router.refresh();
      } else {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        const code = data?.error as DecideErrorCode | undefined;
        setError(
          code === 'not_found' || code === 'invalid_input'
            ? formatDecideErrorMessage(code)
            : UNEXPECTED_RESPONSE_MESSAGE,
        );
      }
    } catch {
      setError(UNEXPECTED_RESPONSE_MESSAGE);
    }
    setPending(null);
  }

  return (
    <div>
      <button type="button" onClick={() => decide('accepted')} disabled={pending !== null}>
        {pending === 'accepted' ? 'Сохранение…' : DECISION_LABELS.accepted}
      </button>
      <button type="button" onClick={() => decide('rejected')} disabled={pending !== null}>
        {pending === 'rejected' ? 'Сохранение…' : DECISION_LABELS.rejected}
      </button>
      <button type="button" onClick={() => decide('deferred')} disabled={pending !== null}>
        {pending === 'deferred' ? 'Сохранение…' : DECISION_LABELS.deferred}
      </button>

      <div>
        <label htmlFor="selectedCandidate">Другой формат вместо предложенного</label>
        <input
          id="selectedCandidate"
          name="selectedCandidate"
          type="text"
          value={selectedCandidate}
          onChange={(event) => setSelectedCandidate(event.target.value)}
        />
        <button type="button" onClick={() => decide('modified')} disabled={pending !== null}>
          {pending === 'modified' ? 'Сохранение…' : DECISION_LABELS.modified}
        </button>
      </div>

      {success && <p role="status">Решение сохранено: {DECISION_LABELS[success]}.</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
