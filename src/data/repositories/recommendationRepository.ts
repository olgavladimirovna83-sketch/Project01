import type { Prisma, Recommendation, RecommendationReason } from '@prisma/client';
import { prisma } from '../prismaClient';

export type RecommendationWithReasons = Recommendation & { reasons: RecommendationReason[] };

export const recommendationRepository = {
  create(data: Prisma.RecommendationCreateInput): Promise<Recommendation> {
    return prisma.recommendation.create({ data });
  },
  // Task 8.3 — `reasons` создаются вложенно в том же вызове
  // (`Prisma.RecommendationCreateInput.reasons.create`), возвращаются
  // сразу с записью — persistence не должен гадать, что было создано.
  createWithReasons(data: Prisma.RecommendationCreateInput): Promise<RecommendationWithReasons> {
    return prisma.recommendation.create({ data, include: { reasons: true } });
  },
  findById(id: string): Promise<Recommendation | null> {
    return prisma.recommendation.findUnique({ where: { id } });
  },
  // Task 9.1 — источник evidence для decisionExplanation.ts: reasons
  // (§28) нужны, чтобы AI объяснял на основе реальных причин, не
  // придумывал их заново.
  findByIdWithReasons(id: string): Promise<RecommendationWithReasons | null> {
    return prisma.recommendation.findUnique({ where: { id }, include: { reasons: true } });
  },
  update(id: string, data: Prisma.RecommendationUpdateInput): Promise<Recommendation> {
    return prisma.recommendation.update({ where: { id }, data });
  },
  // Task 8.3 — "решение можно найти позже" (Olga): чтение уже
  // персистентных рекомендаций пользователя вместе с их причинами,
  // новейшие первыми.
  findByUserId(userId: string): Promise<RecommendationWithReasons[]> {
    return prisma.recommendation.findMany({
      where: { userId },
      include: { reasons: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};
