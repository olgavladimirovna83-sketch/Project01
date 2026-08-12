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
};
