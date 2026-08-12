import { auth } from './config';

// Task 2.3 — единая точка получения user id из сессии для API routes,
// вместо повторения `const session = await auth(); session?.user?.id`
// в каждом protected route по отдельности (CLAUDE.md §6 — authorization
// проверяется на backend на каждом endpoint, одним и тем же способом).
export async function requireSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
