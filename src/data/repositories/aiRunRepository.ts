import type { AiRun, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

// Task 9.1 — первое использование AiRun (29_AI_LAYER.md §24 AI RUN/§76
// КРИТИЧЕСКОЕ ПРАВИЛО №4). Append-only лог, никакого update/upsert — каждый
// AI-запрос это отдельное, неизменяемое событие.
export const aiRunRepository = {
  create(data: Prisma.AiRunCreateInput): Promise<AiRun> {
    return prisma.aiRun.create({ data });
  },
};
