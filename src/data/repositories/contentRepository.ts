import type { Content, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const contentRepository = {
  create(data: Prisma.ContentCreateInput): Promise<Content> {
    return prisma.content.create({ data });
  },
  findById(id: string): Promise<Content | null> {
    return prisma.content.findUnique({ where: { id } });
  },
  // Task 4.1 — dedup ingestion pipeline по natural key
  // (26_DATA_PIPELINE.md §11 DEDUPLICATION); использует уже существующий
  // unique constraint [externalAccountId, externalContentId] (Task 1.1).
  findByExternalId(externalAccountId: string, externalContentId: string): Promise<Content | null> {
    return prisma.content.findUnique({
      where: { externalAccountId_externalContentId: { externalAccountId, externalContentId } },
    });
  },
  update(id: string, data: Prisma.ContentUpdateInput): Promise<Content> {
    return prisma.content.update({ where: { id }, data });
  },
  // Task 5.1 — data quality status: "есть ли явные пробелы" (подключён и
  // синхронизирован, но ни одной публикации не сохранено).
  countByExternalAccountId(externalAccountId: string): Promise<number> {
    return prisma.content.count({ where: { externalAccountId } });
  },
};
