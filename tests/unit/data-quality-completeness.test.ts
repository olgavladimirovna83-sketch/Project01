import { describe, expect, it } from 'vitest';
import { computeCompleteness } from '../../src/dataQuality/completeness';

const T1 = new Date('2026-08-13T10:00:00Z');
const T2 = new Date('2026-08-14T10:00:00Z');

describe('computeCompleteness', () => {
  it('returns null ratio when there is no metric data at all', () => {
    const result = computeCompleteness([]);
    expect(result).toEqual({
      totalContentWithMetrics: 0,
      completeContentCount: 0,
      completenessRatio: null,
    });
  });

  it('treats a content item as complete when its latest batch has no null values', () => {
    const result = computeCompleteness([
      { contentId: 'a', measuredAt: T1, value: 10 },
      { contentId: 'a', measuredAt: T1, value: 20 },
    ]);
    expect(result).toEqual({
      totalContentWithMetrics: 1,
      completeContentCount: 1,
      completenessRatio: 1,
    });
  });

  it('treats a content item as incomplete when its latest batch has any null value (unavailableMetrics)', () => {
    const result = computeCompleteness([
      { contentId: 'a', measuredAt: T1, value: 10 },
      { contentId: 'a', measuredAt: T1, value: null },
    ]);
    expect(result.completeContentCount).toBe(0);
    expect(result.completenessRatio).toBe(0);
  });

  it('computes the 8-out-of-20-style ratio from 08_METRICS_FRAMEWORK.md §57 example', () => {
    const rows = [
      ...Array.from({ length: 12 }, (_, i) => ({
        contentId: `complete-${i}`,
        measuredAt: T1,
        value: 5,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        contentId: `incomplete-${i}`,
        measuredAt: T1,
        value: null,
      })),
    ];
    const result = computeCompleteness(rows);
    expect(result.totalContentWithMetrics).toBe(20);
    expect(result.completeContentCount).toBe(12);
    expect(result.completenessRatio).toBe(0.6);
  });

  it('only evaluates the latest batch per content, ignoring older snapshot rows', () => {
    // Первый sync (T1) — метрика была недоступна. Второй sync (T2) — стала
    // доступна. Полнота должна отражать ТЕКУЩЕЕ состояние (T2), не историю.
    const result = computeCompleteness([
      { contentId: 'a', measuredAt: T1, value: null },
      { contentId: 'a', measuredAt: T2, value: 42 },
    ]);
    expect(result.completeContentCount).toBe(1);
    expect(result.completenessRatio).toBe(1);
  });

  it('handles multiple content items independently', () => {
    const result = computeCompleteness([
      { contentId: 'a', measuredAt: T1, value: 1 },
      { contentId: 'b', measuredAt: T1, value: null },
      { contentId: 'c', measuredAt: T1, value: 1 },
      { contentId: 'c', measuredAt: T1, value: 1 },
    ]);
    expect(result.totalContentWithMetrics).toBe(3);
    expect(result.completeContentCount).toBe(2);
  });
});
