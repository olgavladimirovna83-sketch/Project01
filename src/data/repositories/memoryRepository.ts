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
  // Task 7.1 — первое реальное использование Memory (Task 1.1 создал модель,
  // но до сих пор ничего в неё не писало).
  findByUserId(userId: string): Promise<Memory[]> {
    return prisma.memory.findMany({ where: { userId } });
  },
};
