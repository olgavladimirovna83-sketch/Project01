import { describe, expect, it } from 'vitest';
import { scoreAndRankCandidates } from '../../src/decision/candidateScorer';
import type { MetricRow } from '../../src/analysis/metricRows';
import type { Pattern } from '@prisma/client';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

function row(
  contentId: string,
  contentType: string,
  metricType: string,
  value: number,
): MetricRow & { contentType: string } {
  return { contentId, contentType, metricType, value, measuredAt: day(1), publishedAt: day(1) };
}

function buildPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'pattern-1',
    userId: 'user-1',
    patternType: 'reach',
    description: 'test pattern',
    direction: 'positive',
    strength: 0.5,
    confidence: 0.8,
    status: 'confirmed',
    firstDetectedAt: day(1),
    lastConfirmedAt: day(1),
    lastUpdatedAt: day(1),
    ...overrides,
  } as Pattern;
}

describe('scoreAndRankCandidates', () => {
  it('returns an empty ranking per metric when there are no candidates', () => {
    const result = scoreAndRankCandidates([], [], []);
    expect(result.map((r) => r.metric)).toEqual(['reach', 'likes', 'saved']);
    expect(result.every((r) => r.ranking.length === 0)).toBe(true);
  });

  it('ranks a candidate clearly above the global baseline ahead of one clearly below it', () => {
    const rows: Array<MetricRow & { contentType: string }> = [
      ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)),
      ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 50)),
    ];
    // baseline (все 10 постов) = (300*5 + 50*5) / 10 = 175

    const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, []);

    expect(reachRanking.ranking.map((r) => r.candidate)).toEqual(['reel', 'carousel']);
    expect(reachRanking.ranking[0].comparison).toBe('above');
    expect(reachRanking.ranking[1].comparison).toBe('below');
    expect(reachRanking.ranking[0].label).toContain('above baseline');
  });

  it('places a candidate with no data for the metric last (insufficient_data)', () => {
    const rows: Array<MetricRow & { contentType: string }> = [
      ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)),
      ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 50)),
      // 'video' существует как кандидат (есть контент), но без reach-метрики вовсе
    ];

    const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel', 'video'], rows, []);

    expect(reachRanking.ranking[reachRanking.ranking.length - 1]).toMatchObject({
      candidate: 'video',
      comparison: 'insufficient_data',
      label: 'insufficient data',
    });
  });

  it('does not fabricate a numeric score — labels are qualitative (42_IMPLEMENTATION_ROADMAP-style §40 NO FALSE PRECISION)', () => {
    const rows: Array<MetricRow & { contentType: string }> = [
      ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)),
      ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 50)),
    ];
    const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, []);
    for (const result of reachRanking.ranking) {
      expect(typeof result.label).toBe('string');
      expect(result.label).not.toMatch(/^\d+(\.\d+)?$/);
    }
  });

  it('notes a matching confirmed pattern in the label, only when direction agrees with the comparison', () => {
    const rows: Array<MetricRow & { contentType: string }> = [
      ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)), // above
      ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 50)), // below
    ];
    const positivePattern = buildPattern({ patternType: 'reach', direction: 'positive' });

    const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, [positivePattern]);

    const reel = reachRanking.ranking.find((r) => r.candidate === 'reel')!;
    const carousel = reachRanking.ranking.find((r) => r.candidate === 'carousel')!;
    expect(reel.label).toContain('already confirmed pattern');
    expect(carousel.label).not.toContain('already confirmed pattern'); // below, but pattern is positive — не совпадает
  });

  it('does not attach a pattern note for candidates that are merely at_baseline', () => {
    const rows: Array<MetricRow & { contentType: string }> = [
      row('a', 'reel', 'reach', 100),
      row('b', 'reel', 'reach', 100),
      row('c', 'carousel', 'reach', 100),
      row('d', 'carousel', 'reach', 100),
    ];
    const positivePattern = buildPattern({ patternType: 'reach', direction: 'positive' });
    const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, [positivePattern]);
    for (const result of reachRanking.ranking) {
      expect(result.comparison).toBe('at_baseline');
      expect(result.label).not.toContain('already confirmed pattern');
    }
  });

  it('computes rankings independently per metric, not one combined score across metrics', () => {
    const rows: Array<MetricRow & { contentType: string }> = [
      // reel: высокий reach, низкие likes
      ...Array.from({ length: 5 }, (_, i) => row(`reel-r-${i}`, 'reel', 'reach', 300)),
      ...Array.from({ length: 5 }, (_, i) => row(`reel-l-${i}`, 'reel', 'likes', 5)),
      // carousel: низкий reach, высокие likes
      ...Array.from({ length: 5 }, (_, i) => row(`carousel-r-${i}`, 'carousel', 'reach', 50)),
      ...Array.from({ length: 5 }, (_, i) => row(`carousel-l-${i}`, 'carousel', 'likes', 50)),
    ];

    const result = scoreAndRankCandidates(['reel', 'carousel'], rows, []);
    const reachRanking = result.find((r) => r.metric === 'reach')!;
    const likesRanking = result.find((r) => r.metric === 'likes')!;

    expect(reachRanking.ranking[0].candidate).toBe('reel');
    expect(likesRanking.ranking[0].candidate).toBe('carousel');
  });
});
