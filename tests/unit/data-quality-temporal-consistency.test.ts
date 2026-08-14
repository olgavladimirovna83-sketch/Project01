import { describe, expect, it } from 'vitest';
import { checkTemporalConsistency } from '../../src/dataQuality/temporalConsistency';

const PUBLISHED = new Date('2026-08-10T12:00:00Z');
const BEFORE_PUBLISHED = new Date('2026-08-10T10:00:00Z');
const AFTER_PUBLISHED = new Date('2026-08-11T12:00:00Z');

describe('checkTemporalConsistency', () => {
  it('reports no violations for an empty input', () => {
    expect(checkTemporalConsistency([])).toEqual({ violationCount: 0, violations: [] });
  });

  it('reports no violation when a metric was measured after publication', () => {
    const result = checkTemporalConsistency([
      { contentId: 'a', measuredAt: AFTER_PUBLISHED, publishedAt: PUBLISHED },
    ]);
    expect(result).toEqual({ violationCount: 0, violations: [] });
  });

  it('reports no violation when measuredAt exactly equals publishedAt', () => {
    const result = checkTemporalConsistency([
      { contentId: 'a', measuredAt: PUBLISHED, publishedAt: PUBLISHED },
    ]);
    expect(result.violationCount).toBe(0);
  });

  it('flags a violation when a metric was measured before publication', () => {
    const result = checkTemporalConsistency([
      { contentId: 'a', measuredAt: BEFORE_PUBLISHED, publishedAt: PUBLISHED },
    ]);
    expect(result.violationCount).toBe(1);
    expect(result.violations).toEqual([
      { contentId: 'a', measuredAt: BEFORE_PUBLISHED, publishedAt: PUBLISHED },
    ]);
  });

  it('does not flag rows with a null publishedAt — nothing to compare against', () => {
    const result = checkTemporalConsistency([
      { contentId: 'a', measuredAt: BEFORE_PUBLISHED, publishedAt: null },
    ]);
    expect(result.violationCount).toBe(0);
  });

  it('flags only the violating rows among a mix of valid and invalid ones', () => {
    const result = checkTemporalConsistency([
      { contentId: 'a', measuredAt: AFTER_PUBLISHED, publishedAt: PUBLISHED },
      { contentId: 'b', measuredAt: BEFORE_PUBLISHED, publishedAt: PUBLISHED },
      { contentId: 'c', measuredAt: BEFORE_PUBLISHED, publishedAt: null },
    ]);
    expect(result.violationCount).toBe(1);
    expect(result.violations[0].contentId).toBe('b');
  });
});
