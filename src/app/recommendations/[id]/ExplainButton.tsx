'use client';

import { useState } from 'react';
import {
  formatExplainStatusMessage,
  UNEXPECTED_RESPONSE_MESSAGE,
  type NonCompletedExplainStatus,
} from './explainStatusMessages';

interface DecisionExplanation {
  whyNow: string;
  evidence: string;
  expectedBenefit: string;
  uncertainty: string;
}

type ExplainResponse =
  | { status: 'completed'; explanation: DecisionExplanation; aiRunId: string }
  | { status: NonCompletedExplainStatus; aiRunId: string }
  | { error: string };

export function ExplainButton({ recommendationId }: { recommendationId: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);

  async function handleClick() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(`/api/decision/recommendations/${recommendationId}/explain`, {
        method: 'POST',
      });
      setResult((await response.json()) as ExplainResponse);
    } catch {
      setResult({ error: 'network' });
    }
    setPending(false);
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={pending}>
        {pending ? 'Генерация…' : 'Сгенерировать объяснение'}
      </button>

      {result && 'error' in result && <p role="alert">{UNEXPECTED_RESPONSE_MESSAGE}</p>}

      {result && 'status' in result && result.status !== 'completed' && (
        <p role="alert">{formatExplainStatusMessage(result.status)}</p>
      )}

      {result && 'status' in result && result.status === 'completed' && (
        <section>
          <h2>Почему сейчас</h2>
          <p>{result.explanation.whyNow}</p>
          <h2>Основание</h2>
          <p>{result.explanation.evidence}</p>
          <h2>Ожидаемый эффект</h2>
          <p>{result.explanation.expectedBenefit}</p>
          <h2>Неопределённость</h2>
          <p>{result.explanation.uncertainty}</p>
        </section>
      )}
    </div>
  );
}
