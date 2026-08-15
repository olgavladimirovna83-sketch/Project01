import { describe, expect, it } from 'vitest';
import { buildContentSuggestionPrompt } from '../../src/ai/contentSuggestionPrompt';
import type { ContentKnowledge } from '@prisma/client';

function buildKnowledge(overrides: Partial<ContentKnowledge> = {}): ContentKnowledge {
  return {
    id: 'ck-1',
    category: 'hook_template',
    title: 'Test Hook Type',
    content: 'Principle: test. Templates: "Test template _____"',
    source: 'Test Source.pdf',
    sourceSection: 'Section 1',
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('buildContentSuggestionPrompt', () => {
  it('includes the topic and the given knowledge titles/content in the user message', () => {
    const { messages } = buildContentSuggestionPrompt('a reel about morning skincare', [buildKnowledge()]);
    expect(messages[0].content).toContain('Topic: a reel about morning skincare');
    expect(messages[0].content).toContain('[Test Hook Type]');
    expect(messages[0].content).toContain('Test template _____');
  });

  it('includes multiple knowledge entries, each with its own category', () => {
    const entries = [
      buildKnowledge({ title: 'Hook A', category: 'hook_template' }),
      buildKnowledge({ id: 'ck-2', title: 'Rule B', category: 'headline_rule' }),
    ];
    const { messages } = buildContentSuggestionPrompt('topic', entries);
    expect(messages[0].content).toContain('[Hook A] (hook_template)');
    expect(messages[0].content).toContain('[Rule B] (headline_rule)');
  });

  it('instructs the model to use only given techniques and output the exact required JSON shape', () => {
    const { systemPrompt } = buildContentSuggestionPrompt('topic', [buildKnowledge()]);
    expect(systemPrompt).toContain('Use ONLY the techniques provided');
    expect(systemPrompt).toContain('"suggestions"');
    expect(systemPrompt).toContain('"text"');
    expect(systemPrompt).toContain('"basedOn"');
  });
});
