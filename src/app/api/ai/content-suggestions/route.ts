import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/auth/session';
import { generateContentSuggestions } from '@/ai/contentSuggestion';

/**
 * Task 9.4 — генерирует хук/заголовок-варианты для темы контента, используя
 * реально загруженные `ContentKnowledge` (Task 9.3). State-changing
 * (реальный AI-запрос, создаёт `AiRun`) — `POST`, тот же принцип, что
 * `POST /api/decision/recommendations/[id]/explain` (Task 9.1). Честные
 * состояния (`invalid_topic`/`no_knowledge_available`/`failed`/`timeout`/
 * `provider_unavailable`/`validation_failed`) — 200 с описанием, не
 * HTTP-ошибка, кроме отсутствия/невалидности сессии.
 */
export async function POST(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const topic = body?.topic;
  const category = body?.category;

  if (typeof topic !== 'string') {
    return NextResponse.json(
      { error: 'invalid_input', message: 'topic обязателен.' },
      { status: 400 },
    );
  }
  if (category !== undefined && typeof category !== 'string') {
    return NextResponse.json(
      { error: 'invalid_input', message: 'category, если указан, должен быть строкой.' },
      { status: 400 },
    );
  }

  const result = await generateContentSuggestions(topic, userId, category);
  return NextResponse.json(result);
}
