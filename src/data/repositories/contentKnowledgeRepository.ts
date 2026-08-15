import type { ContentKnowledge, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const contentKnowledgeRepository = {
  create(data: Prisma.ContentKnowledgeCreateInput): Promise<ContentKnowledge> {
    return prisma.contentKnowledge.create({ data });
  },
  findById(id: string): Promise<ContentKnowledge | null> {
    return prisma.contentKnowledge.findUnique({ where: { id } });
  },
  // Task 9.3 — то, что AI при генерации текста должен читать вместо
  // захардкоженного текста: только status: 'active', опционально по
  // category. Список пока растёт вручную (см. prisma/seedContentKnowledge.ts) —
  // сортировка по createdAt для предсказуемого порядка.
  // Task 9.7 — category стала categories (String[], D-0033): фильтр по
  // одной категории теперь ищет её среди тегов записи (has), не точное
  // совпадение единственного значения — запись с несколькими тегами
  // находится по любому из них.
  findActive(category?: string): Promise<ContentKnowledge[]> {
    return prisma.contentKnowledge.findMany({
      where: { status: 'active', ...(category ? { categories: { has: category } } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  },
  // Идемпотентность seed-скрипта — не создавать дубль при повторном запуске
  // с тем же исходником и заголовком записи.
  findBySourceAndTitle(source: string, title: string): Promise<ContentKnowledge | null> {
    return prisma.contentKnowledge.findFirst({ where: { source, title } });
  },
};
