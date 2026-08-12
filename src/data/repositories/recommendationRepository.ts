import type { Prisma, Recommendation } from '@prisma/client';
import { prisma } from '../prismaClient';

export const recommendationRepository = {
  create(data: Prisma.RecommendationCreateInput): Promise<Recommendation> {
    return prisma.recommendation.create({ data });
  },
  findById(id: string): Promise<Recommendation | null> {
    return prisma.recommendation.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.RecommendationUpdateInput): Promise<Recommendation> {
    return prisma.recommendation.update({ where: { id }, data });
  },
};
