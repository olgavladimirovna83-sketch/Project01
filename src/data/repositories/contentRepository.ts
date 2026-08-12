import type { Content, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const contentRepository = {
  create(data: Prisma.ContentCreateInput): Promise<Content> {
    return prisma.content.create({ data });
  },
  findById(id: string): Promise<Content | null> {
    return prisma.content.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.ContentUpdateInput): Promise<Content> {
    return prisma.content.update({ where: { id }, data });
  },
};
