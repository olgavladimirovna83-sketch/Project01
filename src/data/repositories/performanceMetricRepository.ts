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
  // Task 5.2 — сырые (contentId, measuredAt, value) строки для конкретного
  // внешнего аккаунта: вход для completeness.ts/anomalyDetection.ts (чистые
  // функции, без БД). Заменяет более узкий findLatestMeasuredAtByExternalAccountId
  // из Task 5.1 — тот же join через Content, но данных на один запрос
  // достаточно и для freshness (Task 5.1), и для completeness/anomaly
  // (Task 5.2), не нужно два отдельных обращения к БД.
  // Task 5.3 — дополнено publishedAt (join через Content) для
  // temporalConsistency.ts, тот же принцип: один запрос на несколько
  // потребителей, не отдельный запрос под каждую data quality проверку.
  async findRowsByExternalAccountId(externalAccountId: string): Promise<
    Array<{ contentId: string; measuredAt: Date; value: number | null; publishedAt: Date | null }>
  > {
    const rows = await prisma.performanceMetric.findMany({
      where: { content: { externalAccountId } },
      select: {
        contentId: true,
        measuredAt: true,
        value: true,
        content: { select: { publishedAt: true } },
      },
    });
    return rows.map((row) => ({
      contentId: row.contentId,
      measuredAt: row.measuredAt,
      value: row.value,
      publishedAt: row.content.publishedAt,
    }));
  },
};
