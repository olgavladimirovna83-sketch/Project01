import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { createRecommendation } from '@/decision/recommendationPersistence';
import { recommendationRepository } from '@/data/repositories';

/**
 * Task 8.3 — POST пишет в `Recommendation`/`RecommendationReason`
 * (state-changing, тот же принцип, что POST /api/knowledge/capture и
 * POST /api/knowledge/patterns). Возвращает 200 и в случае `created: false`
 * — отсутствие цели/кандидатов/данных не ошибка, а честный, ожидаемый
 * результат (тот же принцип, что goalFit.ts/D-0025), не 4xx/5xx.
 *
 * GET читает уже сохранённые рекомендации пользователя — "решение можно
 * найти позже" (прямая формулировка Olga), read-only.
 */
export async function POST() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await createRecommendation(userId);
  return NextResponse.json(result);
}

export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const recommendations = await recommendationRepository.findByUserId(userId);
  return NextResponse.json({ recommendations });
}
