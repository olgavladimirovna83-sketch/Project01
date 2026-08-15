import { describe, expect, it } from 'vitest';
import { formatSuggestionStatusMessage } from '../../src/app/content-suggestions/contentSuggestionStatusMessages';

describe('formatSuggestionStatusMessage', () => {
  it('honestly names a missing/unusable API key for provider_unavailable, the expected state in this environment', () => {
    const message = formatSuggestionStatusMessage('provider_unavailable');
    expect(message).toContain('недоступен');
    expect(message).not.toContain('успешно');
  });

  it('gives a distinct message for each non-completed status, including the two no-AI-call states', () => {
    const statuses = [
      'invalid_topic',
      'no_knowledge_available',
      'failed',
      'timeout',
      'provider_unavailable',
      'validation_failed',
    ] as const;
    const messages = statuses.map((status) => formatSuggestionStatusMessage(status));
    expect(new Set(messages).size).toBe(statuses.length);
  });

  it('does not claim success language for validation_failed — an invalid AI response must not be shown as real suggestions', () => {
    const message = formatSuggestionStatusMessage('validation_failed');
    expect(message).toContain('не показаны');
  });
});
