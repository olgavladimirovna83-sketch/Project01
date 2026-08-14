import { describe, expect, it } from 'vitest';
import { generateCandidateFormats } from '../../src/decision/candidateGenerator';

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
