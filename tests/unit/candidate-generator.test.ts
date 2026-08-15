import { describe, expect, it } from 'vitest';
import { generateCandidateFormats, mostRecentContentType } from '../../src/decision/candidateGenerator';

describe('generateCandidateFormats', () => {
  it('returns an empty list when there is no content at all', () => {
    expect(generateCandidateFormats([])).toEqual([]);
  });

  it('returns distinct content types actually present, not a fixed universal list', () => {
    const content = [
      { contentType: 'reel' },
      { contentType: 'carousel' },
      { contentType: 'reel' },
      { contentType: 'image' },
    ];
    const result = generateCandidateFormats(content);
    expect(new Set(result)).toEqual(new Set(['reel', 'carousel', 'image']));
    expect(result).toHaveLength(3);
  });

  it('does not include formats the user has never posted (e.g. "video")', () => {
    const content = [{ contentType: 'carousel' }, { contentType: 'image' }];
    const result = generateCandidateFormats(content);
    expect(result).not.toContain('video');
  });
});

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

describe('mostRecentContentType', () => {
  it('returns null when there is no content at all', () => {
    expect(mostRecentContentType([])).toBeNull();
  });

  it('returns null when no content has a publishedAt yet (not synced)', () => {
    const content = [
      { contentType: 'reel', publishedAt: null },
      { contentType: 'carousel', publishedAt: null },
    ];
    expect(mostRecentContentType(content)).toBeNull();
  });

  it('picks the format of the most recently published item, across all formats', () => {
    const content = [
      { contentType: 'carousel', publishedAt: day(1) },
      { contentType: 'reel', publishedAt: day(10) },
      { contentType: 'image', publishedAt: day(5) },
    ];
    expect(mostRecentContentType(content)).toBe('reel');
  });

  it('ignores items with a missing publishedAt when comparing to items that have one', () => {
    const content = [
      { contentType: 'carousel', publishedAt: null },
      { contentType: 'reel', publishedAt: day(1) },
    ];
    expect(mostRecentContentType(content)).toBe('reel');
  });
});
