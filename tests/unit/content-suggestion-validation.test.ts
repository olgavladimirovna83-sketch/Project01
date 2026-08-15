import { describe, expect, it } from 'vitest';
import { parseContentSuggestions } from '../../src/ai/contentSuggestionValidation';

const VALID = {
  suggestions: [
    { text: 'But what they don\'t tell you about mornings is _____', basedOn: 'Mid-Sentence Hook' },
    { text: 'Anti Basic Skincare', basedOn: 'Правило 2. Превращайте заголовок в хук' },
  ],
};

describe('parseContentSuggestions', () => {
  it('accepts a well-formed JSON object with a non-empty suggestions array', () => {
    expect(parseContentSuggestions(JSON.stringify(VALID))).toEqual(VALID.suggestions);
  });

  it('strips a ```json code fence before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(VALID) + '\n```';
    expect(parseContentSuggestions(fenced)).toEqual(VALID.suggestions);
  });

  it('rejects text that is not valid JSON', () => {
    expect(parseContentSuggestions('Here are some hooks for you...')).toBeNull();
  });

  it('rejects an empty suggestions array', () => {
    expect(parseContentSuggestions(JSON.stringify({ suggestions: [] }))).toBeNull();
  });

  it('rejects a missing suggestions key', () => {
    expect(parseContentSuggestions(JSON.stringify({ notSuggestions: [] }))).toBeNull();
  });

  it('rejects a suggestion missing "basedOn"', () => {
    const invalid = { suggestions: [{ text: 'Some hook' }] };
    expect(parseContentSuggestions(JSON.stringify(invalid))).toBeNull();
  });

  it('rejects a suggestion with an empty "text"', () => {
    const invalid = { suggestions: [{ text: '   ', basedOn: 'Some Technique' }] };
    expect(parseContentSuggestions(JSON.stringify(invalid))).toBeNull();
  });

  it('rejects a suggestion with the wrong type for "text"', () => {
    const invalid = { suggestions: [{ text: 42, basedOn: 'Some Technique' }] };
    expect(parseContentSuggestions(JSON.stringify(invalid))).toBeNull();
  });

  it('trims surrounding whitespace from text/basedOn', () => {
    const padded = { suggestions: [{ text: '  Hello  ', basedOn: '  Technique  ' }] };
    expect(parseContentSuggestions(JSON.stringify(padded))).toEqual([
      { text: 'Hello', basedOn: 'Technique' },
    ]);
  });

  it('rejects JSON where suggestions is not an array', () => {
    expect(parseContentSuggestions(JSON.stringify({ suggestions: 'not an array' }))).toBeNull();
  });
});
