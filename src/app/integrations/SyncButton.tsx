'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SyncResult {
  success: boolean;
  contentSynced?: number;
  contentSkipped?: number;
  metricsSynced?: number;
  warnings?: Array<{ externalId?: string; message: string }>;
  message?: string;
}

export function SyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleClick() {
    setPending(true);
    setResult(null);
    const response = await fetch('/api/integrations/instagram/sync', { method: 'POST' });
    const data = (await response.json()) as SyncResult;
    setResult(data);
    setPending(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={pending}>
        {pending ? 'Синхронизация…' : 'Синхронизировать'}
      </button>
      {result &&
        (result.success ? (
          <p role="status">
            Публикаций сохранено: {result.contentSynced}, пропущено: {result.contentSkipped}, метрик
            записано: {result.metricsSynced}
            {result.warnings && result.warnings.length > 0
              ? ` (предупреждений: ${result.warnings.length})`
              : ''}
          </p>
        ) : (
          <p role="alert">Ошибка синхронизации: {result.message}</p>
        ))}
    </div>
  );
}
