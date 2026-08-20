import { NextResponse } from 'next/server';
import type { UserDecisionType } from '@prisma/client';
import { requireSessionUserId } from '@/auth/session';
import { recordUserDecision } from '@/decision/userDecisionPersistence';

/**
 * Task 10.4 — records a user's decision on a `Recommendation` (§56 USER
 * DECISION UI). State-changing (writes `UserDecision`, transitions
 * `Recommendation.status`) — `POST`, same principle as
 * `POST /api/decision/recommendations/[id]/explain` (Task 9.1).
 *
 * `not_found` covers both "no such recommendation" and "belongs to
 * another user" — same privacy-by-design pattern as elsewhere in this
 * codebase (existence of another user's recommendation is never leaked).
 *
 * Route path: `/api/decision/recommendations/[id]/decide` — follows this
 * codebase's already-established `/api/decision/recommendations/[id]/...`
 * nesting (matches `explain`), not the literal
 * `POST /api/v1/recommendations/{id}/decision` path from
 * `27_API_CONTRACTS.md` §30 (a different, unversioned API root that
 * nothing else in this codebase follows either). YELLOW, `DECISIONS.md`
 * D-0034.
 */

const VALID_DECISION_TYPES: readonly UserDecisionType[] = [
  'accepted',
  'rejected',
  'modified',
  'deferred',
  'alternative_selected',
];

function isValidDecisionType(value: unknown): value is UserDecisionType {
  return typeof value === 'string' && (VALID_DECISION_TYPES as readonly string[]).includes(value);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!isValidDecisionType(body?.decisionType)) {
    return NextResponse.json(
      {
        error: 'invalid_input',
        message: `decisionType must be one of: ${VALID_DECISION_TYPES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const result = await recordUserDecision(id, userId, {
    decisionType: body.decisionType,
    selectedCandidate: typeof body.selectedCandidate === 'string' ? body.selectedCandidate : undefined,
    comment: typeof body.comment === 'string' ? body.comment : undefined,
  });

  if (!result.recorded && result.reason === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!result.recorded) {
    return NextResponse.json({ error: result.reason, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ decision: result.decision }, { status: 201 });
}
