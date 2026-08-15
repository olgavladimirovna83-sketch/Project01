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
  publishedAt: Date = day(1),
): MetricRow & { contentType: string } {
  return { contentId, contentType, metricType, value, measuredAt: day(1), publishedAt };
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
    // Task 8.3 — то же самое, но структурно, не через текст label.
    expect(reel.matchesPattern).toBe(true);
    expect(carousel.matchesPattern).toBe(false);
    expect(reachRanking.pattern).toBe(positivePattern);
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

  describe('freshness (Task 8.4, §12 FRESHNESS_WEIGHT)', () => {
    const now = day(200); // фиксированная точка отсчёта для возраста данных

    it('labels a candidate whose most recent post is within 90 days as "recent"', () => {
      const rows: Array<MetricRow & { contentType: string }> = [row('a', 'reel', 'reach', 100, day(150))]; // 50 дней назад
      const [reachRanking] = scoreAndRankCandidates(['reel'], rows, [], null, now);
      expect(reachRanking.ranking[0].freshness).toBe('recent');
    });

    it('labels a candidate whose most recent post is 91-180 days old as "aging"', () => {
      const rows: Array<MetricRow & { contentType: string }> = [row('a', 'reel', 'reach', 100, day(60))]; // 140 дней назад
      const [reachRanking] = scoreAndRankCandidates(['reel'], rows, [], null, now);
      expect(reachRanking.ranking[0].freshness).toBe('aging');
    });

    it('labels a candidate whose most recent post is over 180 days old as "stale"', () => {
      const rows: Array<MetricRow & { contentType: string }> = [row('a', 'reel', 'reach', 100, day(1))]; // 199 дней назад
      const [reachRanking] = scoreAndRankCandidates(['reel'], rows, [], null, now);
      expect(reachRanking.ranking[0].freshness).toBe('stale');
    });

    it('uses the MOST RECENT contributing post, not the oldest, when a candidate has several', () => {
      const rows: Array<MetricRow & { contentType: string }> = [
        row('a', 'reel', 'reach', 100, day(1)), // старый — 199 дней назад
        row('b', 'reel', 'reach', 100, day(150)), // свежий — 50 дней назад
      ];
      const [reachRanking] = scoreAndRankCandidates(['reel'], rows, [], null, now);
      expect(reachRanking.ranking[0].freshness).toBe('recent');
    });

    it('is null (not "stale") when the candidate has no data for the metric at all', () => {
      const rows: Array<MetricRow & { contentType: string }> = [row('a', 'carousel', 'reach', 100, day(150))];
      const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, [], null, now);
      const reel = reachRanking.ranking.find((r) => r.candidate === 'reel')!;
      expect(reel.freshness).toBeNull();
    });
  });

  describe('repetition (Task 8.4, §13-14 RECENCY_OVERRIDE/REPETITION_CONTROL)', () => {
    it('notes a competitive alternative when the top candidate is also the most recently published format', () => {
      const rows: Array<MetricRow & { contentType: string }> = [
        // 'image' не входит в candidates — только тянет baseline вниз, как
        // в реальных данных baseline считается по ВСЕМ форматам (D-0019).
        ...Array.from({ length: 5 }, (_, i) => row(`image-${i}`, 'image', 'reach', 50)),
        ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 200)),
        ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)),
      ];
      // baseline = (50*5 + 200*5 + 300*5) / 15 ≈ 183.3
      // reel: +63.6% → above; carousel: +9.1% → at_baseline (конкурентная)
      const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, [], 'reel');
      expect(reachRanking.ranking[0].candidate).toBe('reel');
      expect(reachRanking.ranking[1]).toMatchObject({ candidate: 'carousel', comparison: 'at_baseline' });
      expect(reachRanking.ranking[0].repetitionNote).toContain('carousel');
    });

    it('does not note anything when there is no competitive alternative (§14: "тот же формат снова может стать рекомендацией")', () => {
      const rows: Array<MetricRow & { contentType: string }> = [
        ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)), // above
        ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 10)), // below — не конкурентная
      ];
      const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, [], 'reel');
      expect(reachRanking.ranking[0].repetitionNote).toBeNull();
    });

    it('does not note anything when the top candidate is NOT the most recently published format', () => {
      const rows: Array<MetricRow & { contentType: string }> = [
        ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)),
        ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 175)),
      ];
      const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, [], 'carousel');
      expect(reachRanking.ranking[0].candidate).toBe('reel');
      expect(reachRanking.ranking[0].repetitionNote).toBeNull();
    });

    it('defaults to no repetition note when mostRecentContentType is not provided', () => {
      const rows: Array<MetricRow & { contentType: string }> = [
        ...Array.from({ length: 5 }, (_, i) => row(`reel-${i}`, 'reel', 'reach', 300)),
        ...Array.from({ length: 5 }, (_, i) => row(`carousel-${i}`, 'carousel', 'reach', 175)),
      ];
      const [reachRanking] = scoreAndRankCandidates(['reel', 'carousel'], rows, []);
      expect(reachRanking.ranking[0].repetitionNote).toBeNull();
    });
  });
});
