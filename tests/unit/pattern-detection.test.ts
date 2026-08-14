import { describe, expect, it } from 'vitest';
import { detectMetricPattern } from '../../src/knowledge/patternDetection';
import type { MetricRow } from '../../src/analysis/metricRows';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

function makeRow(contentId: string, value: number, publishedAt: Date): MetricRow {
  return { contentId, metricType: 'reach', value, measuredAt: publishedAt, publishedAt };
}

describe('detectMetricPattern', () => {
  it('reports no direction when there is no data at all', () => {
    const result = detectMetricPattern([], 'reach');
    expect(result).toEqual({
      metric: 'reach',
      direction: null,
      observationCount: 0,
      matchingCount: 0,
      consistency: null,
      strength: null,
      confidence: null,
    });
  });

  it('reports no direction below the minimum observation count, even with perfect consistency', () => {
    // 3 публикации, все явно выше нормы — но 26_DATA_PIPELINE.md §29:
    // "один успешный пост не должен автоматически создавать «это всегда работает»"
    const rows = [
      makeRow('a', 100, day(1)),
      makeRow('b', 100, day(2)),
      makeRow('c', 500, day(3)), // сильно выше — тянет baseline вверх, но выборка всё равно мала
    ];
    const result = detectMetricPattern(rows, 'reach');
    expect(result.direction).toBeNull();
    expect(result.observationCount).toBe(3);
  });

  it('detects a positive pattern when a clear majority runs above baseline', () => {
    const rows = [
      makeRow('a', 100, day(1)),
      makeRow('b', 100, day(2)),
      makeRow('c', 200, day(3)), // выше нормы
      makeRow('d', 200, day(4)), // выше нормы
      makeRow('e', 200, day(5)), // выше нормы
      makeRow('f', 200, day(6)), // выше нормы
      makeRow('g', 200, day(7)), // выше нормы
    ];
    // baseline = (100*2 + 200*5) / 7 = 171.43; порог 10%: below < 154.29,
    // above > 188.57 → 100 below (2), 200 above (5), consistency = 5/7 ≈ 0.71 (≥ 0.6)
    const result = detectMetricPattern(rows, 'reach');
    expect(result.direction).toBe('positive');
    expect(result.observationCount).toBe(7);
    expect(result.matchingCount).toBe(5);
    expect(result.consistency).toBeCloseTo(5 / 7);
    expect(result.strength).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects a negative pattern when a clear majority runs below baseline', () => {
    const rows = [
      makeRow('a', 500, day(1)),
      makeRow('b', 500, day(2)),
      makeRow('c', 100, day(3)),
      makeRow('d', 100, day(4)),
      makeRow('e', 100, day(5)),
      makeRow('f', 100, day(6)),
      makeRow('g', 100, day(7)),
    ];
    // baseline = (500*2 + 100*5) / 7 = 214.29; 500 above (2), 100 below (5),
    // consistency = 5/7 ≈ 0.71 (≥ 0.6)
    const result = detectMetricPattern(rows, 'reach');
    expect(result.direction).toBe('negative');
    expect(result.matchingCount).toBe(5);
  });

  it('reports no direction when there is no clear majority (below consistency threshold)', () => {
    const rows = [
      makeRow('a', 100, day(1)),
      makeRow('b', 100, day(2)),
      makeRow('c', 100, day(3)),
      makeRow('d', 300, day(4)),
      makeRow('e', 300, day(5)),
      makeRow('f', 300, day(6)),
    ];
    // baseline = 200; 100 явно ниже (3), 300 явно выше (3) — ровно 50/50, ниже порога 60%
    const result = detectMetricPattern(rows, 'reach');
    expect(result.direction).toBeNull();
    expect(result.consistency).toBeLessThan(0.6);
  });

  it('gives higher confidence to a larger sample even at similar (comfortably majority) consistency', () => {
    // ~30% low / ~70% high в обоих случаях — консистентность выше порога
    // 0.6 независимо от n, единственная переменная — объём выборки.
    const buildRows = (n: number): MetricRow[] => {
      const lowCount = Math.floor(n * 0.3);
      return Array.from({ length: n }, (_, i) =>
        i < lowCount ? makeRow(`low-${i}`, 100, day(i + 1)) : makeRow(`high-${i}`, 300, day(i + 1)),
      );
    };

    const small = detectMetricPattern(buildRows(6), 'reach');
    const large = detectMetricPattern(buildRows(20), 'reach');

    expect(small.direction).toBe('positive');
    expect(large.direction).toBe('positive');
    expect(large.confidence!).toBeGreaterThan(small.confidence!);
  });

  it('only considers the given metricType', () => {
    const rows: MetricRow[] = [
      { contentId: 'a', metricType: 'reach', value: 200, measuredAt: day(1), publishedAt: day(1) },
      { contentId: 'a', metricType: 'likes', value: 5, measuredAt: day(1), publishedAt: day(1) },
      { contentId: 'b', metricType: 'reach', value: 200, measuredAt: day(2), publishedAt: day(2) },
      { contentId: 'b', metricType: 'likes', value: 5, measuredAt: day(2), publishedAt: day(2) },
      { contentId: 'c', metricType: 'reach', value: 100, measuredAt: day(3), publishedAt: day(3) },
      { contentId: 'c', metricType: 'likes', value: 5, measuredAt: day(3), publishedAt: day(3) },
      { contentId: 'd', metricType: 'reach', value: 200, measuredAt: day(4), publishedAt: day(4) },
      { contentId: 'e', metricType: 'reach', value: 200, measuredAt: day(5), publishedAt: day(5) },
    ];
    const result = detectMetricPattern(rows, 'reach');
    expect(result.observationCount).toBe(5); // только 5 reach-строк, не 10
  });
});
