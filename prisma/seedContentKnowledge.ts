/**
 * Task 9.3 — загружает `contentKnowledgeSeedData.entries` в `ContentKnowledge`.
 * Идемпотентно: проверяет source+title перед вставкой, безопасно
 * перезапускать при добавлении новых записей в `contentKnowledgeSeedData.ts`.
 *
 * Task 9.7 — при существующей (source, title) записи дополнительно
 * сверяет `categories` с данными в `contentKnowledgeSeedData.ts` и
 * обновляет их при расхождении (title/content/source/sourceSection не
 * трогаются — они и есть ключ идемпотентности). Без этого правка тегов
 * существующей записи в коде молча не применялась бы при повторном
 * запуске — ровно тот сценарий, который встретился при пересмотре
 * записей на дополнительные теги (D-0033).
 *
 * Запуск: `npm run seed:content-knowledge`.
 */

import { PrismaClient } from '@prisma/client';
import { entries } from './contentKnowledgeSeedData';

const prisma = new PrismaClient();

function sameCategories(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

async function main() {
  let created = 0;
  let categoriesUpdated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const existing = await prisma.contentKnowledge.findFirst({
      where: { source: entry.source, title: entry.title },
    });
    if (existing) {
      if (!sameCategories(existing.categories, entry.categories)) {
        await prisma.contentKnowledge.update({
          where: { id: existing.id },
          data: { categories: entry.categories },
        });
        categoriesUpdated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    await prisma.contentKnowledge.create({ data: entry });
    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `ContentKnowledge seed: создано ${created}, обновлены теги ${categoriesUpdated}, без изменений ${skipped}.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
