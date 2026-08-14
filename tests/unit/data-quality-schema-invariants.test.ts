import { describe, expect, it } from 'vitest';
import { findUniquenessViolations } from '../../src/dataQuality/schemaInvariants';

describe('findUniquenessViolations', () => {
  it('returns nothing when every group has count 1 (the expected real-world state)', () => {
    const result = findUniquenessViolations([
      { key: 'instagram::123', count: 1 },
      { key: 'instagram::456', count: 1 },
    ]);
    expect(result).toEqual([]);
  });

  it('returns nothing for an empty input', () => {
    expect(findUniquenessViolations([])).toEqual([]);
  });

  it('flags a group whose count is greater than 1', () => {
    const result = findUniquenessViolations([
      { key: 'instagram::123', count: 1 },
      { key: 'instagram::456', count: 2 },
    ]);
    expect(result).toEqual([{ key: 'instagram::456', count: 2 }]);
  });

  it('flags multiple violating groups at once', () => {
    const result = findUniquenessViolations([
      { key: 'a', count: 3 },
      { key: 'b', count: 1 },
      { key: 'c', count: 2 },
    ]);
    expect(result).toEqual([
      { key: 'a', count: 3 },
      { key: 'c', count: 2 },
    ]);
  });
});
