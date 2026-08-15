import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { generateDecisionExplanation } from '@/ai/decisionExplanation';

/**
 * Task 9.1 — генерирует объяснение (§50 DECISION EXPLANATION,
 * `21_DECISION_LOGIC.md`) для уже сохранённой `Recommendation` через
 * реальный AI-запрос — state-changing (создаёт `AiRun`, стоит денег/API
 * quota), поэтому `POST`, тот же принцип, что `POST /api/knowledge/capture`
 * (Task 7.1). `created: false`-подобные честные состояния
 * (`failed`/`timeout`/`provider_unavailable`/`validation_failed`) — это
 * ожидаемые, обработанные исходы, не HTTP-ошибки — 200 с описанием,
 * тот же принцип, что `POST /api/decision/recommendations` (Task 8.3).
 * `not_found` — единственное настоящее состояние ошибки доступа (чужая или
 * несуществующая рекомендация, неразличимо — см. `generateDecisionExplanation`).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const result = await generateDecisionExplanation(id, userId);

  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
