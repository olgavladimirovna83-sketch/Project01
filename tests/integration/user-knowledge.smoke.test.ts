import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { getUserKnowledge } from '../../src/knowledge/userKnowledge';

/**
 * Task 7.3 — против реальной БД (не мок). Не делает сетевых вызовов к
 * Instagram — getUserKnowledge только читает уже существующие таблицы.
 * Прямая проверка 42_IMPLEMENTATION_ROADMAP.md §39: система реально может
 * ответить "что мы знаем", не только хранить это внутри БД.
 */

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const userId of createdUserIds) {
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
  createdUserIds.push(user.id);
  return user;
}

describe('getUserKnowledge', () => {
  it('returns empty lists for a user with no accumulated knowledge yet', async () => {
    const user = await createUser();
    const knowledge = await getUserKnowledge(user.id);
    expect(knowledge).toEqual({ memories: [], patterns: [] });
  });

  it('returns Memory and Pattern records created by Task 7.1/7.2, most confident/recent first', async () => {
    const user = await createUser();

    const older = await prisma.memory.create({
      data: {
        userId: user.id,
        memoryType: 'fact',
        content: 'reach: older observation',
        confidence: 0.5,
        source: 'analytics',
      },
    });
    // Гарантируем разный createdAt для проверки сортировки — Memory.createdAt
    // не параметризуется через create({data}), но у только что созданной
    // записи он уже "в прошлом" относительно следующей на десятки мс.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = await prisma.memory.create({
      data: {
        userId: user.id,
        memoryType: 'fact',
        content: 'reach: newer observation',
        confidence: 0.8,
        source: 'analytics',
      },
    });

    await prisma.pattern.create({
      data: {
        userId: user.id,
        patternType: 'likes',
        description: 'likes: слабая закономерность',
        direction: 'positive',
        confidence: 0.3,
      },
    });
    await prisma.pattern.create({
      data: {
        userId: user.id,
        patternType: 'reach',
        description: 'reach: сильная закономерность',
        direction: 'positive',
        confidence: 0.8,
      },
    });
    await prisma.pattern.create({
      data: {
        userId: user.id,
        patternType: 'saved',
        description: 'saved: больше не действует',
        direction: 'negative',
        confidence: 0.9,
        status: 'inactive',
      },
    });

    const knowledge = await getUserKnowledge(user.id);

    expect(knowledge.memories.map((m) => m.id)).toEqual([newer.id, older.id]); // сначала свежее
    expect(knowledge.patterns.map((p) => p.patternType)).toEqual(['reach', 'likes']); // сначала увереннее
    expect(knowledge.patterns.every((p) => p.status !== 'inactive')).toBe(true);
  });

  it('excludes memories that are not active', async () => {
    const user = await createUser();
    await prisma.memory.create({
      data: {
        userId: user.id,
        memoryType: 'fact',
        content: 'archived observation',
        source: 'analytics',
        status: 'archived',
      },
    });

    const knowledge = await getUserKnowledge(user.id);
    expect(knowledge.memories).toHaveLength(0);
  });
});
