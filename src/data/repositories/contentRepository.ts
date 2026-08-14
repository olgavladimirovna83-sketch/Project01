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
  // Task 8.1 — CANDIDATE_GENERATOR (23_SYSTEM_ARCHITECTURE.md §25):
  // список кандидатов-форматов берётся из реально существующих у
  // пользователя Content.contentType, не захардкожен. Полные строки, не
  // только contentType — candidateScorer.ts join'ит по contentId с
  // PerformanceMetric, чтобы посчитать per-формат производительность.
  findByUserId(userId: string): Promise<Content[]> {
    return prisma.content.findMany({ where: { userId } });
  },
  // Task 5.1 — data quality status: "есть ли явные пробелы" (подключён и
  // синхронизирован, но ни одной публикации не сохранено).
  countByExternalAccountId(externalAccountId: string): Promise<number> {
    return prisma.content.count({ where: { externalAccountId } });
  },
  // Task 5.3 — consistency-проверка (schemaInvariants.ts): счётчики по
  // [externalAccountId, externalContentId] — group > 1 нарушал бы
  // @@unique (Task 1.1). NULL-пары (плейсхолдер-значения, ещё не
  // заполненные sync'ом) исключены — не настоящий natural key, Postgres их
  // и не считает нарушающими уникальность (NULL != NULL). Фильтрация
  // count>1 — в чистой findUniquenessViolations (schemaInvariants.ts),
  // не здесь, см. комментарий в externalAccountRepository.ts.
  async findExternalContentIdGroupCounts(): Promise<Array<{ key: string; count: number }>> {
    const groups = await prisma.content.groupBy({
      by: ['externalAccountId', 'externalContentId'],
      where: { externalAccountId: { not: null }, externalContentId: { not: null } },
      _count: { id: true },
    });
    return groups.map((g) => ({
      key: `${g.externalAccountId}::${g.externalContentId}`,
      count: g._count.id,
    }));
  },
};
