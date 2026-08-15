import { describe, expect, it } from 'vitest';
import { formatExplainStatusMessage } from '../../src/app/recommendations/[id]/explainStatusMessages';

describe('formatExplainStatusMessage', () => {
  it('honestly names a missing/unusable API key for provider_unavailable, the expected state in this environment (no ANTHROPIC_API_KEY)', () => {
    const message = formatExplainStatusMessage('provider_unavailable');
    expect(message).toContain('недоступен');
    expect(message).not.toContain('успешно');
  });

  it('gives a distinct message for each non-completed status — not one generic catch-all', () => {
    const statuses = ['failed', 'timeout', 'provider_unavailable', 'validation_failed'] as const;
    const messages = statuses.map((status) => formatExplainStatusMessage(status));
    expect(new Set(messages).size).toBe(statuses.length);
  });

  it('does not claim success language for validation_failed — an invalid AI response must not be shown as a real explanation', () => {
    const message = formatExplainStatusMessage('validation_failed');
    expect(message).toContain('не показано');
  });
});
