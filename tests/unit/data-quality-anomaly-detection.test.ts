import { describe, expect, it } from 'vitest';
import { detectSyncCountAnomaly } from '../../src/dataQuality/anomalyDetection';

const DAY_MS = 24 * 60 * 60 * 1000;
const day = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * DAY_MS);

/** Строит строки одного "прогона" — contentId's, синхронизированные с
 * разницей в несколько секунд друг от друга (меньше SYNC_RUN_GAP_MS). */
function run(baseTime: Date, contentIds: string[]) {
  return contentIds.map((contentId, i) => ({
    contentId,
    measuredAt: new Date(baseTime.getTime() + i * 1000),
  }));
}

describe('detectSyncCountAnomaly', () => {
  it('reports insufficient_history for no data at all', () => {
    const result = detectSyncCountAnomaly([]);
    expect(result).toEqual({
      status: 'insufficient_history',
      lastRunContentCount: null,
      historicalAverageContentCount: null,
      runsDetected: 0,
    });
  });

  it('reports insufficient_history when only one sync run has ever happened', () => {
    const rows = run(day(0), ['a', 'b', 'c']);
    const result = detectSyncCountAnomaly(rows);
    expect(result.status).toBe('insufficient_history');
    expect(result.lastRunContentCount).toBe(3);
    expect(result.historicalAverageContentCount).toBeNull();
    expect(result.runsDetected).toBe(1);
  });

  it('reports ok when the last run is roughly consistent with history', () => {
    const rows = [
      ...run(day(0), ['a', 'b', 'c', 'd', 'e']),
      ...run(day(1), ['a', 'b', 'c', 'd', 'e']),
      ...run(day(2), ['a', 'b', 'c', 'd']),
    ];
    const result = detectSyncCountAnomaly(rows);
    expect(result.status).toBe('ok');
    expect(result.lastRunContentCount).toBe(4);
    expect(result.historicalAverageContentCount).toBe(5);
    expect(result.runsDetected).toBe(3);
  });

  it('reports anomaly when the last run is far below the historical average (relative, not absolute)', () => {
    const rows = [
      ...run(day(0), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
      ...run(day(1), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
      ...run(day(2), ['a', 'b']), // 2 out of a usual 10 — well below 50%
    ];
    const result = detectSyncCountAnomaly(rows);
    expect(result.status).toBe('anomaly');
    expect(result.lastRunContentCount).toBe(2);
    expect(result.historicalAverageContentCount).toBe(10);
  });

  it('does not flag a small account (few posts historically) using an absolute threshold', () => {
    // 2 из обычных 3 — не аномалия (относительный порог 50% от среднего:
    // 2 >= 3 * 0.5). Абсолютный порог по числу постов легко ошибся бы для
    // маленького аккаунта — здесь именно относительное сравнение.
    const rows = [
      ...run(day(0), ['a', 'b', 'c']),
      ...run(day(1), ['a', 'b', 'c']),
      ...run(day(2), ['a', 'b']),
    ];
    const result = detectSyncCountAnomaly(rows);
    expect(result.status).toBe('ok');
  });

  it('averages across all historical runs, not just the immediately preceding one', () => {
    const rows = [
      ...run(day(0), ['a', 'b', 'c', 'd']), // 4
      ...run(day(1), ['a', 'b']), // 2
      ...run(day(2), ['a']), // 1 — last run
    ];
    // historical average = (4 + 2) / 2 = 3; last run 1 < 3 * 0.5 = 1.5 → anomaly
    const result = detectSyncCountAnomaly(rows);
    expect(result.historicalAverageContentCount).toBe(3);
    expect(result.status).toBe('anomaly');
  });

  it('counts distinct content ids per run, not raw row count (multiple metrics per content)', () => {
    const rows = [
      ...run(day(0), ['a', 'a', 'a', 'b', 'b']), // 2 distinct content items, 5 metric rows
      ...run(day(1), ['a', 'a', 'b', 'b']), // 2 distinct content items
    ];
    const result = detectSyncCountAnomaly(rows);
    expect(result.lastRunContentCount).toBe(2);
    expect(result.historicalAverageContentCount).toBe(2);
    expect(result.status).toBe('ok');
  });
});
