import { describe, expect, it } from 'vitest';
import { parseExplanation } from '../../src/ai/decisionExplanationValidation';

const VALID = {
  whyNow: 'Your reach is currently strong for this format.',
  evidence: 'Reel performance is above your personal baseline.',
  expectedBenefit: 'Likely continued above-average reach.',
  uncertainty: 'Confidence is medium — sample size is still small.',
};

describe('parseExplanation', () => {
  it('accepts a well-formed JSON object with all four required fields', () => {
    expect(parseExplanation(JSON.stringify(VALID))).toEqual(VALID);
  });

  it('strips a ```json code fence before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(VALID) + '\n```';
    expect(parseExplanation(fenced)).toEqual(VALID);
  });

  it('strips a bare ``` code fence (no "json" tag) before parsing', () => {
    const fenced = '```\n' + JSON.stringify(VALID) + '\n```';
    expect(parseExplanation(fenced)).toEqual(VALID);
  });

  it('rejects text that is not valid JSON at all', () => {
    expect(parseExplanation('I think this format works well because...')).toBeNull();
  });

  it('rejects a JSON object missing a required field', () => {
    const { uncertainty: _uncertainty, ...missingUncertainty } = VALID;
    expect(parseExplanation(JSON.stringify(missingUncertainty))).toBeNull();
  });

  it('rejects a required field that is an empty string', () => {
    expect(parseExplanation(JSON.stringify({ ...VALID, evidence: '   ' }))).toBeNull();
  });

  it('rejects a required field with the wrong type', () => {
    expect(parseExplanation(JSON.stringify({ ...VALID, expectedBenefit: 42 }))).toBeNull();
  });

  it('rejects a JSON array (not an object)', () => {
    expect(parseExplanation(JSON.stringify([VALID]))).toBeNull();
  });

  it('rejects JSON null', () => {
    expect(parseExplanation('null')).toBeNull();
  });

  it('trims surrounding whitespace from field values', () => {
    const padded = { ...VALID, whyNow: `  ${VALID.whyNow}  ` };
    expect(parseExplanation(JSON.stringify(padded))?.whyNow).toBe(VALID.whyNow);
  });

  it('tolerates extra, unexpected fields without failing validation', () => {
    const withExtra = { ...VALID, modelOpinion: 'I really like this one' };
    expect(parseExplanation(JSON.stringify(withExtra))).toEqual(VALID);
  });
});
