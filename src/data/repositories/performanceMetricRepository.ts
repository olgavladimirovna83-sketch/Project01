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
  // Task 5.1 — data quality status: "когда последний раз обновлялись
  // publication-level данные" для конкретного внешнего аккаунта.
  // PerformanceMetric не хранит externalAccountId напрямую — join через
  // Content, у которого оно есть (Task 4.1).
  async findLatestMeasuredAtByExternalAccountId(externalAccountId: string): Promise<Date | null> {
    const latest = await prisma.performanceMetric.findFirst({
      where: { content: { externalAccountId } },
      orderBy: { measuredAt: 'desc' },
      select: { measuredAt: true },
    });
    return latest?.measuredAt ?? null;
  },
};
