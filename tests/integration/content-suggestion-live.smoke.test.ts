import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { generateContentSuggestions } from '../../src/ai/contentSuggestion';

const hasCredentials = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Живой smoke-тест против настоящего Anthropic API — не мок. Пропускается,
 * если ANTHROPIC_API_KEY не задан, тот же принцип, что
 * `decision-explanation-live.smoke.test.ts` (Task 9.1) и Instagram
 * (Task 3.2). Стоит реальных денег/API quota — намеренно не входит в
 * обычный `npm test`, только когда ключ явно присутствует.
 */
describe.skipIf(!hasCredentials)('generateContentSuggestions — live smoke test', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it(
    'generates real, schema-valid suggestions from the real Anthropic API using real ContentKnowledge',
    async () => {
      const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
      createdUserIds.push(user.id);

      const result = await generateContentSuggestions(
        'a reel about my morning skincare routine',
        user.id,
        'hook_template',
      );

      // eslint-disable-next-line no-console
      console.log('[Task 9.4] real Anthropic content suggestions result:', JSON.stringify(result, null, 2));

      expect(result.status).toBe('completed');
      if (result.status !== 'completed') throw new Error('expected completed');
      expect(result.suggestions.length).toBeGreaterThan(0);
      for (const suggestion of result.suggestions) {
        expect(suggestion.text.length).toBeGreaterThan(0);
        expect(suggestion.basedOn.length).toBeGreaterThan(0);
      }

      const aiRun = await prisma.aiRun.findUnique({ where: { id: result.aiRunId } });
      expect(aiRun?.provider).toBe('anthropic');
      expect(aiRun?.status).toBe('completed');
      expect(aiRun?.inputTokens).toBeGreaterThan(0);
      expect(aiRun?.outputTokens).toBeGreaterThan(0);
    },
    30000,
  );
});
