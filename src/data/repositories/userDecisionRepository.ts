import type { Prisma, UserDecision } from '@prisma/client';
import { prisma } from '../prismaClient';

export const userDecisionRepository = {
  create(data: Prisma.UserDecisionCreateInput): Promise<UserDecision> {
    return prisma.userDecision.create({ data });
  },
  findById(id: string): Promise<UserDecision | null> {
    return prisma.userDecision.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.UserDecisionUpdateInput): Promise<UserDecision> {
    return prisma.userDecision.update({ where: { id }, data });
  },
};
