/**
 * Task 5.2 — простая аномалия: последняя синхронизация вернула заметно
 * меньше записей, чем обычно для этого аккаунта — сравнение с историей
 * самого аккаунта, не абсолютный порог (прямое требование Olga).
 *
 * Честная оговорка: в схеме нет отдельной сущности "sync run" — sync не
 * персистит собственную границу выполнения, только результат (Content/
 * PerformanceMetric/AccountSnapshot строки, Task 4.1/4.2). Это намеренно —
 * Task 4.1 сознательно не хранит ничего сверх нормализованных данных
 * (DECISIONS.md D-0011), а Task 5.1/5.2 по требованию Olga не добавляют
 * новых данных, только сводят существующее. Поэтому границы прошлых sync
 * восстанавливаются приближённо: PerformanceMetric.measuredAt строго общий
 * для всех метрик одной публикации в одном sync (instagramSync.ts,
 * `const measuredAt = new Date()` один раз на публикацию), но чуть
 * отличается между публикациями того же sync (доли секунд — на HTTP-вызовы
 * между ними). Timestamps группируются в "прогоны" по разрыву между
 * соседними по времени значениями: если следующая метка появилась более
 * чем через SYNC_RUN_GAP_MS после предыдущей — это уже другой sync.
 *
 * Точная граница синхронизации (не приближение) потребовала бы новой
 * персистентной сущности "sync run" — сознательно не делается в Task 5.2,
 * кандидат на будущую задачу, если приближения окажется недостаточно.
 */

// Разрыв между sync-прогонами — заглушка, не измеренная величина (как
// STALE_AFTER_MS в dataQualityStatus.ts, Task 5.1): один sync с retry
// (Task 4.3, до 3 попыток на публикацию с backoff) на аккаунте из ~25
// публикаций укладывается в секунды-десятки секунд, не в минуты. 5 минут —
// заведомо больше одного sync, но заведомо меньше "человек кликнул снова
// через пару минут". Подлежит пересмотру вместе с реальной периодичностью.
const SYNC_RUN_GAP_MS = 5 * 60 * 1000;

// Относительный, не абсолютный порог (прямое требование Olga): последний
// прогон считается аномальным, если он меньше половины среднего по
// предыдущим прогонам этого же аккаунта.
const ANOMALY_RATIO_THRESHOLD = 0.5;

export type SyncCountAnomalyStatus = 'ok' | 'anomaly' | 'insufficient_history';

export interface SyncCountAnomalyResult {
  status: SyncCountAnomalyStatus;
  lastRunContentCount: number | null;
  historicalAverageContentCount: number | null;
  /** Сколько прогонов (включая последний) удалось различить в истории. */
  runsDetected: number;
}

export interface ContentTimestampRow {
  contentId: string;
  measuredAt: Date;
}

export function detectSyncCountAnomaly(rows: ContentTimestampRow[]): SyncCountAnomalyResult {
  if (rows.length === 0) {
    return {
      status: 'insufficient_history',
      lastRunContentCount: null,
      historicalAverageContentCount: null,
      runsDetected: 0,
    };
  }

  const sorted = [...rows].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());

  const runs: Array<Set<string>> = [];
  let currentRun = new Set<string>();
  let previousTimestampMs: number | null = null;

  for (const { contentId, measuredAt } of sorted) {
    const timestampMs = measuredAt.getTime();
    if (previousTimestampMs !== null && timestampMs - previousTimestampMs > SYNC_RUN_GAP_MS) {
      runs.push(currentRun);
      currentRun = new Set<string>();
    }
    currentRun.add(contentId);
    previousTimestampMs = timestampMs;
  }
  runs.push(currentRun);

  const runCounts = runs.map((run) => run.size);
  const lastRunContentCount = runCounts[runCounts.length - 1];
  const historicalRunCounts = runCounts.slice(0, -1);

  if (historicalRunCounts.length === 0) {
    return {
      status: 'insufficient_history',
      lastRunContentCount,
      historicalAverageContentCount: null,
      runsDetected: runCounts.length,
    };
  }

  const historicalAverageContentCount =
    historicalRunCounts.reduce((sum, count) => sum + count, 0) / historicalRunCounts.length;
  const isAnomaly = lastRunContentCount < historicalAverageContentCount * ANOMALY_RATIO_THRESHOLD;

  return {
    status: isAnomaly ? 'anomaly' : 'ok',
    lastRunContentCount,
    historicalAverageContentCount,
    runsDetected: runCounts.length,
  };
}
