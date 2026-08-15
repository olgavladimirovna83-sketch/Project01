import { describe, expect, it } from 'vitest';
import { determineGoalFit } from '../../src/decision/goalFit';

const TRACKED = ['reach', 'likes', 'saved'] as const;

describe('determineGoalFit', () => {
  it('reports no_goals_defined when the user has no goals at all', () => {
    const result = determineGoalFit([], TRACKED);
    expect(result).toEqual({
      primaryMetric: null,
      reason: 'no_goals_defined',
      matchedGoal: null,
      untrackedGoals: [],
    });
  });

  it('reports no_goals_defined when goals exist but none are active', () => {
    const result = determineGoalFit(
      [{ goalType: 'reach', priority: 1, status: 'archived' }],
      TRACKED,
    );
    expect(result.reason).toBe('no_goals_defined');
  });

  it('matches a single active goal to its metric', () => {
    const result = determineGoalFit(
      [{ goalType: 'reach', priority: 1, status: 'active' }],
      TRACKED,
    );
    expect(result.reason).toBe('goal_matched');
    expect(result.primaryMetric).toBe('reach');
    expect(result.matchedGoal).toEqual({ goalType: 'reach', priority: 1 });
    expect(result.untrackedGoals).toEqual([]);
  });

  it('treats "saves" (document wording) as the same metric as "saved" (Instagram field name, D-0018)', () => {
    const result = determineGoalFit(
      [{ goalType: 'saves', priority: 1, status: 'active' }],
      TRACKED,
    );
    expect(result.reason).toBe('goal_matched');
    expect(result.primaryMetric).toBe('saved');
  });

  it('picks the lower-priority-number goal as primary (rank-style, §7 example: 1 = main goal)', () => {
    const result = determineGoalFit(
      [
        { goalType: 'likes', priority: 3, status: 'active' },
        { goalType: 'reach', priority: 1, status: 'active' },
      ],
      TRACKED,
    );
    expect(result.primaryMetric).toBe('reach');
    expect(result.matchedGoal?.priority).toBe(1);
  });

  it('reports no_tracked_goals explicitly when the only goal is "followers" (not collected, D-0018)', () => {
    const result = determineGoalFit(
      [{ goalType: 'followers', priority: 1, status: 'active' }],
      TRACKED,
    );
    expect(result.reason).toBe('no_tracked_goals');
    expect(result.primaryMetric).toBeNull();
    expect(result.untrackedGoals).toEqual(['followers']);
  });

  it('falls through to a lower-priority tracked goal when the top goal is untracked', () => {
    const result = determineGoalFit(
      [
        { goalType: 'followers', priority: 1, status: 'active' },
        { goalType: 'likes', priority: 2, status: 'active' },
      ],
      TRACKED,
    );
    expect(result.reason).toBe('goal_matched');
    expect(result.primaryMetric).toBe('likes');
    expect(result.untrackedGoals).toEqual(['followers']);
  });

  it('reports no_tracked_goals and lists every untracked goal when none of several goals are trackable', () => {
    const result = determineGoalFit(
      [
        { goalType: 'followers', priority: 1, status: 'active' },
        { goalType: 'comments', priority: 2, status: 'active' },
      ],
      TRACKED,
    );
    expect(result.reason).toBe('no_tracked_goals');
    expect(result.untrackedGoals).toEqual(['followers', 'comments']);
  });

  it('ignores inactive goals even when a tracked active goal also exists', () => {
    const result = determineGoalFit(
      [
        { goalType: 'reach', priority: 5, status: 'active' },
        { goalType: 'likes', priority: 1, status: 'archived' },
      ],
      TRACKED,
    );
    expect(result.primaryMetric).toBe('reach');
  });
});
