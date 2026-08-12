import type { Memory, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const memoryRepository = {
  create(data: Prisma.MemoryCreateInput): Promise<Memory> {
    return prisma.memory.create({ data });
  },
  findById(id: string): Promise<Memory | null> {
    return prisma.memory.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.MemoryUpdateInput): Promise<Memory> {
    return prisma.memory.update({ where: { id }, data });
  },
};
