import { describe, expect, it } from 'vitest';
import { AIService } from '../../src/ai';

describe('AIService smoke test', () => {
  it('exposes a generate function', () => {
    expect(typeof AIService.generate).toBe('function');
  });
});
