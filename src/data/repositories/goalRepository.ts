import type { Goal, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const goalRepository = {
  create(data: Prisma.GoalCreateInput): Promise<Goal> {
    return prisma.goal.create({ data });
  },
  findById(id: string): Promise<Goal | null> {
    return prisma.goal.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    return prisma.goal.update({ where: { id }, data });
  },
  // Task 8.2 — первое реальное использование Goal.priority (модель с
  // Task 1.1, до сих пор только create/read по id в тестах и /api/goals,
  // ни один код не читал цели пользователя как список для решения).
  findByUserId(userId: string): Promise<Goal[]> {
    return prisma.goal.findMany({ where: { userId } });
  },
};
