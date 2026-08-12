import type { PerformanceMetric, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const performanceMetricRepository = {
  create(data: Prisma.PerformanceMetricCreateInput): Promise<PerformanceMetric> {
    return prisma.performanceMetric.create({ data });
  },
  findById(id: string): Promise<PerformanceMetric | null> {
    return prisma.performanceMetric.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.PerformanceMetricUpdateInput): Promise<PerformanceMetric> {
    return prisma.performanceMetric.update({ where: { id }, data });
  },
};
