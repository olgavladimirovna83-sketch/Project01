import { describe, expect, it } from 'vitest';
import { formatGoalFormErrorMessage, UNEXPECTED_RESPONSE_MESSAGE } from '../../src/app/goals/goalFormStatusMessages';

describe('formatGoalFormErrorMessage', () => {
  it('gives a distinct, non-generic message for invalid_input', () => {
    const message = formatGoalFormErrorMessage('invalid_input');
    expect(message).not.toBe(UNEXPECTED_RESPONSE_MESSAGE);
    expect(message.length).toBeGreaterThan(0);
  });

  it('gives a distinct, non-generic message for unauthorized', () => {
    const message = formatGoalFormErrorMessage('unauthorized');
    expect(message).not.toBe(UNEXPECTED_RESPONSE_MESSAGE);
    expect(message.length).toBeGreaterThan(0);
  });

  it('every named state has its own message — no shared catch-all text', () => {
    const messages = new Set([
      formatGoalFormErrorMessage('invalid_input'),
      formatGoalFormErrorMessage('unauthorized'),
    ]);
    expect(messages.size).toBe(2);
  });
});
