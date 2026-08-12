import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { goalRepository, userRepository } from '../../src/data/repositories';

/**
 * Phase 1 completion smoke test (42_IMPLEMENTATION_ROADMAP.md §8):
 * создать user → сохранить данные → получить данные обратно.
 * Требует живой PostgreSQL (DATABASE_URL) с применёнными миграциями.
 */
describe('user data flow smoke test', () => {
  let createdUserId: string | undefined;

  afterAll(async () => {
    if (createdUserId) {
      // onDelete: Cascade на Goal.userId — удаление user убирает и Goal.
      await prisma.user.delete({ where: { id: createdUserId } });
    }
  });

  it('creates a user, saves related data, and reads it back', async () => {
    const user = await userRepository.create({ timezone: 'Europe/Moscow' });
    createdUserId = user.id;

    const goal = await goalRepository.create({
      goalType: 'followers',
      priority: 1,
      user: { connect: { id: user.id } },
    });

    const fetchedUser = await userRepository.findById(user.id);
    const fetchedGoal = await goalRepository.findById(goal.id);

    expect(fetchedUser?.id).toBe(user.id);
    expect(fetchedUser?.timezone).toBe('Europe/Moscow');
    expect(fetchedGoal?.id).toBe(goal.id);
    expect(fetchedGoal?.goalType).toBe('followers');
    expect(fetchedGoal?.userId).toBe(user.id);
  });
});
