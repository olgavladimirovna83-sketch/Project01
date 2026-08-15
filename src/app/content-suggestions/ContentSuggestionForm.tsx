'use client';

import { useState, type FormEvent } from 'react';
import {
  formatSuggestionStatusMessage,
  UNEXPECTED_RESPONSE_MESSAGE,
  type NonCompletedSuggestionStatus,
} from './contentSuggestionStatusMessages';

interface ContentSuggestion {
  text: string;
  basedOn: string;
}

type SuggestResponse =
  | { status: 'completed'; suggestions: ContentSuggestion[]; aiRunId: string }
  | { status: NonCompletedSuggestionStatus; aiRunId?: string }
  | { error: string };

/**
 * Task 9.5 — экран для Task 9.4 (`generateContentSuggestions`), зеркально
 * тому, как `ExplainButton.tsx` (Task 9.2) стал экраном для Task 9.1. Не
 * привязан к существующему ресурсу по id (в отличие от Recommendation) —
 * пользователь вводит тему свободным текстом, форма вызывает уже
 * существующий `POST /api/ai/content-suggestions`. Категория не
 * выбирается в UI — бэкенд по умолчанию использует `hook_template`+
 * `headline_rule` (единственные категории с переиспользуемыми текстовыми
 * шаблонами, D-0031); остальные категории (`content_strategy`/
 * `posting_schedule`) не про генерацию фраз, выбор их в UI создал бы
 * ложидание результата, которого не будет.
 */
export function ContentSuggestionForm() {
  const [topic, setTopic] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SuggestResponse | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const response = await fetch('/api/ai/content-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      setResult((await response.json()) as SuggestResponse);
    } catch {
      setResult({ error: 'network' });
    }
    setPending(false);
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="topic">Тема поста</label>
        <input
          id="topic"
          name="topic"
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Например: рилс про утренний уход за кожей"
        />
        <button type="submit" disabled={pending}>
          {pending ? 'Генерация…' : 'Сгенерировать варианты'}
        </button>
      </form>

      {result && 'error' in result && <p role="alert">{UNEXPECTED_RESPONSE_MESSAGE}</p>}

      {result && 'status' in result && result.status !== 'completed' && (
        <p role="alert">{formatSuggestionStatusMessage(result.status)}</p>
      )}

      {result && 'status' in result && result.status === 'completed' && (
        <section>
          <h2>Варианты</h2>
          <ul>
            {result.suggestions.map((suggestion, index) => (
              <li key={index}>
                <p>{suggestion.text}</p>
                <p>Приём: {suggestion.basedOn}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
