'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  formatGoalFormErrorMessage,
  UNEXPECTED_RESPONSE_MESSAGE,
  type GoalFormErrorCode,
} from './goalFormStatusMessages';

/**
 * Task 10.1 — форма поверх уже существующего `POST /api/goals` (Task 8.x),
 * тот же паттерн, что `SyncButton`/`DisconnectButton` (Task 3.4/4.1):
 * client component, `fetch` + `router.refresh()` на успехе, чтобы
 * server component `page.tsx` перечитал список целей из БД.
 *
 * `goalType` — закрытый выбор из трёх РЕАЛЬНО отслеживаемых метрик
 * (`analysis/metricsAnalytics.ts` CORE_METRICS), не открытое поле — сам
 * API (`goalRepository`) по-прежнему принимает любую непустую строку
 * (открытая конвенция, как `Content.contentType`/`ContentKnowledge.category`),
 * но форма сознательно не предлагает цель, для которой `determineGoalFit`
 * (Task 8.2) заведомо ответит `no_tracked_goals` (например `followers` —
 * данные для неё не собираются, D-0018) — честно, не создавать
 * пользователю ложную иллюзию рабочей цели.
 */

const GOAL_TYPE_LABELS: Record<string, string> = {
  reach: 'Охваты (reach)',
  likes: 'Лайки (likes)',
  saved: 'Сохранения (saved)',
};

const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS);

interface GoalFormProps {
  nextPriority: number;
}

export function GoalForm({ nextPriority }: GoalFormProps) {
  const router = useRouter();
  const [goalType, setGoalType] = useState(GOAL_TYPES[0]);
  const [priority, setPriority] = useState(nextPriority);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalType, priority }),
      });

      if (response.ok) {
        setSuccess(true);
        setPriority(nextPriority + 1);
        router.refresh();
      } else {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        const code = data?.error as GoalFormErrorCode | undefined;
        setError(code === 'invalid_input' || code === 'unauthorized' ? formatGoalFormErrorMessage(code) : UNEXPECTED_RESPONSE_MESSAGE);
      }
    } catch {
      setError(UNEXPECTED_RESPONSE_MESSAGE);
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="goalType">Цель</label>
      <select id="goalType" name="goalType" value={goalType} onChange={(event) => setGoalType(event.target.value)}>
        {GOAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {GOAL_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      <label htmlFor="priority">Приоритет (0 — самая важная цель, дальше по возрастанию)</label>
      <input
        id="priority"
        name="priority"
        type="number"
        min={0}
        value={priority}
        onChange={(event) => setPriority(Number(event.target.value))}
      />

      <button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : 'Добавить цель'}
      </button>

      {success && <p role="status">Цель сохранена.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
