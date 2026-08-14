import { describe, expect, it } from 'vitest';
import { formatFactContent } from '../../src/knowledge/analyticsMemory';
import type { MetricSummary } from '../../src/analysis/metricsAnalytics';

const PERIOD = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-31T23:59:59Z') };

function buildSummary(overrides: Partial<MetricSummary> = {}): MetricSummary {
  return {
    metric: 'reach',
    period: PERIOD,
    sampleSize: 10,
    sum: 1500,
    average: 150,
    trend: 'up',
    baseline: {
      metric: 'reach',
      average: 100,
      sampleSize: 20,
      confidence: 'high',
      calculatedAt: new Date('2026-08-31T12:00:00Z'),
    },
    comparisonToBaseline: 'above',
    confidence: 'high',
    ...overrides,
  };
}

describe('formatFactContent', () => {
  it('includes platform, metric, period, value, baseline, comparison, trend and confidence', () => {
    const content = formatFactContent('instagram', buildSummary());

    expect(content).toContain('instagram/reach');
    expect(content).toContain('2026-08-01..2026-08-31');
    expect(content).toContain('150');
    expect(content).toContain('N=10');
    expect(content).toContain('100');
    expect(content).toContain('N=20');
    expect(content).toContain('above');
    expect(content).toContain('up');
    expect(content).toContain('high');
  });

  it('produces a distinct, readable string per metric', () => {
    const reach = formatFactContent('instagram', buildSummary({ metric: 'reach' }));
    const likes = formatFactContent('instagram', buildSummary({ metric: 'likes' }));
    expect(reach).not.toBe(likes);
    expect(likes).toContain('instagram/likes');
  });
});
