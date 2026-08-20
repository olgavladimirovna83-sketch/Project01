import { describe, expect, it } from 'vitest';
import { RECOMMENDATION_STATUS_BY_DECISION_TYPE } from '../../src/decision/userDecisionPersistence';

/**
 * Task 10.4 — чистая проверка status-mapping'а, отдельно от интеграционного
 * теста (который проверяет, что маппинг реально применяется к БД). Особо
 * важно: `alternative_selected` — единственный тип без буквального
 * one-to-one совпадения имени с `RecommendationStatus` (YELLOW, D-0034) —
 * тест фиксирует именно это решение, не даёт ему незаметно измениться.
 */
describe('RECOMMENDATION_STATUS_BY_DECISION_TYPE', () => {
  it('maps accepted/rejected/modified onto the identically-named status', () => {
    expect(RECOMMENDATION_STATUS_BY_DECISION_TYPE.accepted).toBe('accepted');
    expect(RECOMMENDATION_STATUS_BY_DECISION_TYPE.rejected).toBe('rejected');
    expect(RECOMMENDATION_STATUS_BY_DECISION_TYPE.modified).toBe('modified');
  });

  it('maps deferred onto postponed — "save for later", not a rejection (D-0034)', () => {
    expect(RECOMMENDATION_STATUS_BY_DECISION_TYPE.deferred).toBe('postponed');
  });

  it('maps alternative_selected onto modified — no dedicated status exists (YELLOW, D-0034)', () => {
    expect(RECOMMENDATION_STATUS_BY_DECISION_TYPE.alternative_selected).toBe('modified');
  });

  it('covers exactly the five documented UserDecisionType values, no more, no fewer', () => {
    expect(Object.keys(RECOMMENDATION_STATUS_BY_DECISION_TYPE).sort()).toEqual(
      ['accepted', 'alternative_selected', 'deferred', 'modified', 'rejected'].sort(),
    );
  });
});
