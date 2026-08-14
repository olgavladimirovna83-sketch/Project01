import type { Pattern, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const patternRepository = {
  create(data: Prisma.PatternCreateInput): Promise<Pattern> {
    return prisma.pattern.create({ data });
  },
  findById(id: string): Promise<Pattern | null> {
    return prisma.pattern.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.PatternUpdateInput): Promise<Pattern> {
    return prisma.pattern.update({ where: { id }, data });
  },
  // Task 7.2 — первое реальное использование Pattern (Task 1.1 создал
  // модель, но до сих пор ничего в неё не писало).
  findByUserId(userId: string): Promise<Pattern[]> {
    return prisma.pattern.findMany({ where: { userId } });
  },
};
