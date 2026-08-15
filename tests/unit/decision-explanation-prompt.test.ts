import { describe, expect, it } from 'vitest';
import { buildExplanationPrompt } from '../../src/ai/decisionExplanationPrompt';
import type { RecommendationWithReasons } from '../../src/data/repositories';

function buildRecommendation(overrides: Partial<RecommendationWithReasons> = {}): RecommendationWithReasons {
  return {
    id: 'rec-1',
    userId: 'user-1',
    goalId: 'goal-1',
    primaryCandidate: 'reel',
    confidence: 0.8,
    status: 'generated',
    decisionVersion: 'decision-v1',
    context: {
      goal: { id: 'goal-1', goalType: 'reach', priority: 1 },
      primaryMetric: 'reach',
      ranking: [
        { candidate: 'reel', comparison: 'above', confidence: 'high' },
        { candidate: 'carousel', comparison: 'below', confidence: 'medium' },
      ],
      untrackedGoals: [],
      decisionVersion: 'decision-v1',
      skeletonVersion: null,
    },
    createdAt: new Date('2026-01-01'),
    expiresAt: null,
    reasons: [
      { id: 'r1', recommendationId: 'rec-1', reasonType: 'goal', description: 'Goal "reach" selected', weight: null, confidence: null },
      { id: 'r2', recommendationId: 'rec-1', reasonType: 'baseline', description: 'above baseline, high confidence', weight: null, confidence: 0.8 },
    ],
    ...overrides,
  } as RecommendationWithReasons;
}

describe('buildExplanationPrompt', () => {
  it('includes the recommended format, goal, metric, and reasons in the user message', () => {
    const { messages } = buildExplanationPrompt(buildRecommendation());
    const content = messages[0].content;
    expect(content).toContain('"reel"');
    expect(content).toContain('reach');
    expect(content).toContain('[goal] Goal "reach" selected');
    expect(content).toContain('[baseline] above baseline, high confidence (confidence: 0.8)');
  });

  it('uses the qualitative confidence label from context.ranking, not the raw numeric Recommendation.confidence', () => {
    const { messages } = buildExplanationPrompt(buildRecommendation());
    // "Confidence in this comparison" описывает кандидата качественной
    // меткой ('high'), не числом Recommendation.confidence (0.8) — числа
    // из отдельных reasons (evidence) допустимы и ожидаемы отдельно.
    expect(messages[0].content).toContain('Confidence in this comparison: high');
    expect(messages[0].content).not.toMatch(/Confidence in this comparison: 0\.8/);
  });

  it('falls back to "unknown" confidence when the primary candidate is missing from context.ranking', () => {
    const recommendation = buildRecommendation({
      context: { primaryMetric: 'reach', ranking: [] },
    });
    const { messages } = buildExplanationPrompt(recommendation);
    expect(messages[0].content).toContain('Confidence in this comparison: unknown');
  });

  it('tolerates a missing or malformed context without throwing', () => {
    const recommendation = buildRecommendation({ context: null });
    expect(() => buildExplanationPrompt(recommendation)).not.toThrow();
    const { messages } = buildExplanationPrompt(recommendation);
    expect(messages[0].content).toContain('Confidence in this comparison: unknown');
  });

  it('shows a placeholder instead of silently omitting evidence when there are no reasons', () => {
    const recommendation = buildRecommendation({ reasons: [] });
    const { messages } = buildExplanationPrompt(recommendation);
    expect(messages[0].content).toContain('(no recorded reasons)');
  });

  it('instructs the model not to invent facts or overstate confidence, and to output only the four required JSON fields', () => {
    const { systemPrompt } = buildExplanationPrompt(buildRecommendation());
    expect(systemPrompt).toContain('Never invent facts');
    expect(systemPrompt).toContain('Never state more certainty than the given confidence level supports');
    expect(systemPrompt).toContain('"whyNow"');
    expect(systemPrompt).toContain('"evidence"');
    expect(systemPrompt).toContain('"expectedBenefit"');
    expect(systemPrompt).toContain('"uncertainty"');
  });
});
