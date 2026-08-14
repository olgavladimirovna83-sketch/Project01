import { memoryRepository, patternRepository } from '@/data/repositories';
import type { Memory, Pattern } from '@prisma/client';

/**
 * Task 7.3 — Phase 7 completion (42_IMPLEMENTATION_ROADMAP.md §39: "система
 * может ответить: что мы знаем об этом пользователе и почему мы это
 * знаем"). До этой задачи Memory (Task 7.1) и Pattern (Task 7.2)
 * существовали только как write-триггеры (POST /api/knowledge/capture,
 * POST /api/knowledge/patterns) — оба возвращают счётчики
 * (created/skipped, detected/skipped), не сами записи. Не было НИ ОДНОГО
 * способа реально спросить систему "что ты знаешь", кроме прямого
 * обращения к БД в обход приложения — то есть буквальный критерий §39 не
 * выполнялся, несмотря на то что данные уже были.
 *
 * "Почему" отвечается тем, что уже есть на каждой записи — `content`
 * (Memory) / `description` (Pattern) содержат человекочитаемое
 * обоснование, `confidence`/`source` — насколько и откуда. Формальных
 * evidence references по-прежнему нет (§16/§37 MEMORY_EVIDENCE,
 * DECISIONS.md D-0022/D-0023) — эта задача не добавляет их, только
 * делает уже существующее знание читаемым через API.
 *
 * Фильтрация по статусу: Memory.status по умолчанию 'active' (никакой
 * код пока не меняет его на другое значение — фильтр не no-op с точки
 * зрения семантики, honest reading схемы, даже если сейчас не отсекает
 * ничего реального). Pattern.status исключает только 'inactive'
 * (22_DATA_MODEL.md §17 PATTERN_STATUS — "inactive" явно значит
 * закономерность больше не считается действующей, не должна выдаваться
 * как текущее знание); "hypothesis" остаётся видимым — это тоже знание,
 * просто с низкой уверенностью, что и так видно по `confidence`.
 */

export interface UserKnowledge {
  memories: Memory[];
  patterns: Pattern[];
}

export async function getUserKnowledge(userId: string): Promise<UserKnowledge> {
  const [allMemories, allPatterns] = await Promise.all([
    memoryRepository.findByUserId(userId),
    patternRepository.findByUserId(userId),
  ]);

  const memories = allMemories
    .filter((memory) => memory.status === 'active')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const patterns = allPatterns
    .filter((pattern) => pattern.status !== 'inactive')
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  return { memories, patterns };
}
