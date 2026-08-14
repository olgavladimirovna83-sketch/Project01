import { describe, expect, it } from 'vitest';
import { computeMetricsAnalytics, summarizeMetric } from '../../src/analysis/metricsAnalytics';

const PERIOD = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-31T23:59:59Z') };
const day = (n: number) => new Date(Date.UTC(2026, 7, n));

describe('summarizeMetric', () => {
  it('returns sampleSize 0 and average null when there is no data at all', () => {
    const result = summarizeMetric([], 'reach', PERIOD);
    expect(result).toEqual({
      metric: 'reach',
      period: PERIOD,
      sampleSize: 0,
      sum: 0,
      average: null,
      trend: 'insufficient_data',
    });
  });

  it('computes sum/average from one value per content', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'b', metricType: 'reach', value: 200, measuredAt: day(5), publishedAt: day(2) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.sampleSize).toBe(2);
    expect(result.sum).toBe(300);
    expect(result.average).toBe(150);
  });

  it('only counts the given metricType, ignoring other metrics on the same content', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'a', metricType: 'likes', value: 20, measuredAt: day(5), publishedAt: day(1) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.sampleSize).toBe(1);
    expect(result.sum).toBe(100);
  });

  it('uses only the latest snapshot per content, not a sum of all historical snapshots', () => {
    // Тот же пост синхронизировался дважды: reach вырос с 100 до 300.
    // Должно учитываться только последнее значение (300), не 100+300.
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'a', metricType: 'reach', value: 300, measuredAt: day(7), publishedAt: day(1) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.sampleSize).toBe(1);
    expect(result.sum).toBe(300);
  });

  it('excludes content published outside the period', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      {
        contentId: 'b',
        metricType: 'reach',
        value: 999,
        measuredAt: new Date('2026-07-15T00:00:00Z'),
        publishedAt: new Date('2026-07-15T00:00:00Z'), // до начала периода
      },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.sampleSize).toBe(1);
    expect(result.sum).toBe(100);
  });

  it('ignores rows with a null value (unavailable metric, 08_METRICS_FRAMEWORK.md §11)', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: null, measuredAt: day(5), publishedAt: day(1) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.sampleSize).toBe(0);
    expect(result.average).toBeNull();
  });

  it('reports insufficient_data trend with fewer than two publications', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.trend).toBe('insufficient_data');
  });

  it('reports stable trend when the two halves of the period are close', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'b', metricType: 'reach', value: 105, measuredAt: day(5), publishedAt: day(2) },
      { contentId: 'c', metricType: 'reach', value: 98, measuredAt: day(5), publishedAt: day(20) },
      { contentId: 'd', metricType: 'reach', value: 102, measuredAt: day(5), publishedAt: day(21) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.trend).toBe('stable');
  });

  it('reports up trend when later publications clearly outperform earlier ones', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'b', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(2) },
      { contentId: 'c', metricType: 'reach', value: 500, measuredAt: day(5), publishedAt: day(20) },
      { contentId: 'd', metricType: 'reach', value: 500, measuredAt: day(5), publishedAt: day(21) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.trend).toBe('up');
  });

  it('reports down trend when later publications clearly underperform earlier ones', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 500, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'b', metricType: 'reach', value: 500, measuredAt: day(5), publishedAt: day(2) },
      { contentId: 'c', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(20) },
      { contentId: 'd', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(21) },
    ];
    const result = summarizeMetric(rows, 'reach', PERIOD);
    expect(result.trend).toBe('down');
  });
});

describe('computeMetricsAnalytics', () => {
  it('computes a summary for every core metric (reach/likes/saved)', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'a', metricType: 'likes', value: 10, measuredAt: day(5), publishedAt: day(1) },
      { contentId: 'a', metricType: 'saved', value: 3, measuredAt: day(5), publishedAt: day(1) },
    ];
    const result = computeMetricsAnalytics(rows, PERIOD);
    expect(result.map((r) => r.metric)).toEqual(['reach', 'likes', 'saved']);
    expect(result.find((r) => r.metric === 'saved')?.sum).toBe(3);
  });

  it('does not include followers_gained — not collected by ingestion yet', () => {
    const result = computeMetricsAnalytics([], PERIOD);
    expect(result.map((r) => r.metric)).not.toContain('followers_gained');
  });
});
