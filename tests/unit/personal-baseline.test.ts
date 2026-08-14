import { describe, expect, it } from 'vitest';
import {
  compareToBaseline,
  computeBaseline,
  confidenceFromSampleSize,
} from '../../src/analysis/personalBaseline';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));
const NOW = new Date('2026-08-13T12:00:00Z');

describe('confidenceFromSampleSize', () => {
  it('reports low confidence for fewer than 5 publications', () => {
    expect(confidenceFromSampleSize(0)).toBe('low');
    expect(confidenceFromSampleSize(2)).toBe('low');
    expect(confidenceFromSampleSize(4)).toBe('low');
  });

  it('reports medium confidence between 5 and 14 publications', () => {
    expect(confidenceFromSampleSize(5)).toBe('medium');
    expect(confidenceFromSampleSize(14)).toBe('medium');
  });

  it('reports high confidence at 15 publications or more', () => {
    expect(confidenceFromSampleSize(15)).toBe('high');
    expect(confidenceFromSampleSize(100)).toBe('high');
  });
});

describe('computeBaseline', () => {
  it('returns null average and low confidence when there is no data at all', () => {
    const result = computeBaseline([], 'reach', NOW);
    expect(result).toEqual({
      metric: 'reach',
      average: null,
      sampleSize: 0,
      confidence: 'low',
      calculatedAt: NOW,
    });
  });

  it('averages the latest value per content across all history, not limited to any period', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(1), publishedAt: day(1) },
      { contentId: 'b', metricType: 'reach', value: 300, measuredAt: day(1), publishedAt: day(200) },
    ];
    const result = computeBaseline(rows, 'reach', NOW);
    expect(result.sampleSize).toBe(2);
    expect(result.average).toBe(200);
  });

  it('uses only the latest snapshot per content, not a sum of all historical snapshots', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(1), publishedAt: day(1) },
      { contentId: 'a', metricType: 'reach', value: 300, measuredAt: day(5), publishedAt: day(1) },
    ];
    const result = computeBaseline(rows, 'reach', NOW);
    expect(result.sampleSize).toBe(1);
    expect(result.average).toBe(300);
  });

  it('ignores other metric types on the same content', () => {
    const rows = [
      { contentId: 'a', metricType: 'reach', value: 100, measuredAt: day(1), publishedAt: day(1) },
      { contentId: 'a', metricType: 'likes', value: 20, measuredAt: day(1), publishedAt: day(1) },
    ];
    const result = computeBaseline(rows, 'reach', NOW);
    expect(result.sampleSize).toBe(1);
    expect(result.average).toBe(100);
  });
});

describe('compareToBaseline', () => {
  const highConfidenceBaseline = {
    metric: 'reach',
    average: 100,
    sampleSize: 20,
    confidence: 'high' as const,
    calculatedAt: NOW,
  };

  it('reports insufficient_data when the period has no average', () => {
    const result = compareToBaseline(null, 0, highConfidenceBaseline);
    expect(result.comparison).toBe('insufficient_data');
  });

  it('reports insufficient_data when the baseline itself has no average', () => {
    const emptyBaseline = { ...highConfidenceBaseline, average: null, sampleSize: 0 };
    const result = compareToBaseline(150, 10, emptyBaseline);
    expect(result.comparison).toBe('insufficient_data');
  });

  it('reports above when the period average clearly exceeds the baseline', () => {
    const result = compareToBaseline(200, 10, highConfidenceBaseline);
    expect(result.comparison).toBe('above');
  });

  it('reports below when the period average clearly falls short of the baseline', () => {
    const result = compareToBaseline(50, 10, highConfidenceBaseline);
    expect(result.comparison).toBe('below');
  });

  it('reports at_baseline when the period average is close to the baseline (within the relative threshold)', () => {
    const result = compareToBaseline(105, 10, highConfidenceBaseline);
    expect(result.comparison).toBe('at_baseline');
  });

  it('does not overstate confidence when the baseline is strong but the current period has very few posts', () => {
    // Прямое требование Olga: "мало публикаций — низкий confidence, не
    // выдавай уверенный вывод на 2-3 постах" — даже если baseline (20
    // публикаций) надёжен, сравнение опирается ещё и на текущий период.
    const result = compareToBaseline(200, 2, highConfidenceBaseline);
    expect(result.confidence).toBe('low');
  });

  it('does not overstate confidence when the current period is large but the baseline itself is thin', () => {
    const thinBaseline = { ...highConfidenceBaseline, sampleSize: 3, confidence: 'low' as const };
    const result = compareToBaseline(200, 20, thinBaseline);
    expect(result.confidence).toBe('low');
  });

  it('reports high confidence only when both the baseline and the period are well-sampled', () => {
    const result = compareToBaseline(200, 20, highConfidenceBaseline);
    expect(result.confidence).toBe('high');
  });

  it('treats a zero baseline average as a valid comparison point, not insufficient_data', () => {
    const zeroBaseline = { ...highConfidenceBaseline, average: 0 };
    const above = compareToBaseline(10, 10, zeroBaseline);
    expect(above.comparison).toBe('above');
    const atZero = compareToBaseline(0, 10, zeroBaseline);
    expect(atZero.comparison).toBe('at_baseline');
  });
});
