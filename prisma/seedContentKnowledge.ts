/**
 * Task 9.3 — загружает `contentKnowledgeSeedData.entries` в `ContentKnowledge`.
 * Идемпотентно: проверяет source+title перед вставкой, безопасно
 * перезапускать при добавлении новых записей в `contentKnowledgeSeedData.ts`.
 *
 * Запуск: `npm run seed:content-knowledge`.
 */

import { PrismaClient } from '@prisma/client';
import { entries } from './contentKnowledgeSeedData';

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    const existing = await prisma.contentKnowledge.findFirst({
      where: { source: entry.source, title: entry.title },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.contentKnowledge.create({ data: entry });
    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`ContentKnowledge seed: создано ${created}, пропущено (уже существовали) ${skipped}.`);
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
