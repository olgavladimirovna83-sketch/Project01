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
};
