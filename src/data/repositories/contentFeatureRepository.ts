import type { ContentFeature, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const contentFeatureRepository = {
  create(data: Prisma.ContentFeatureCreateInput): Promise<ContentFeature> {
    return prisma.contentFeature.create({ data });
  },
  findById(id: string): Promise<ContentFeature | null> {
    return prisma.contentFeature.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.ContentFeatureUpdateInput): Promise<ContentFeature> {
    return prisma.contentFeature.update({ where: { id }, data });
  },
};
