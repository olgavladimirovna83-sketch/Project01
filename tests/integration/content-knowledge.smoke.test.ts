import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { contentKnowledgeRepository } from '../../src/data/repositories';

/**
 * Task 9.3 — против реальной БД (не мок). `ContentKnowledge` НЕ привязана
 * к пользователю (внешнее ремесленное знание, не производное от
 * пользовательских данных, см. `DECISIONS.md` D-0030) — тесты используют
 * синтетические записи с уникальным `source`, не трогают реально
 * засеянные Task 9.3 записи (`prisma/seedContentKnowledge.ts`).
 */

const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length > 0) {
    await prisma.contentKnowledge.deleteMany({ where: { id: { in: createdIds } } });
  }
  await prisma.$disconnect();
});

function testSource() {
  return `test-source-${Date.now()}-${Math.random()}`;
}

describe('contentKnowledgeRepository', () => {
  it('creates a record and reads it back by id', async () => {
    const source = testSource();
    const created = await contentKnowledgeRepository.create({
      categories: ['hook_template'],
      title: 'Test hook',
      content: 'Test content',
      source,
      sourceSection: 'Test section',
    });
    createdIds.push(created.id);

    const found = await contentKnowledgeRepository.findById(created.id);
    expect(found).toMatchObject({ categories: ['hook_template'], title: 'Test hook', status: 'active' });
  });

  it('findActive returns only status: active records, excluding archived ones', async () => {
    const source = testSource();
    const active = await contentKnowledgeRepository.create({
      categories: ['headline_rule'],
      title: 'Active rule',
      content: 'x',
      source,
    });
    const archived = await contentKnowledgeRepository.create({
      categories: ['headline_rule'],
      title: 'Archived rule',
      content: 'x',
      source,
      status: 'archived',
    });
    createdIds.push(active.id, archived.id);

    const results = await contentKnowledgeRepository.findActive();
    const ids = results.map((r) => r.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(archived.id);
  });

  it('findActive(category) filters to only the requested category', async () => {
    const source = testSource();
    const hookRow = await contentKnowledgeRepository.create({
      categories: ['hook_template'],
      title: 'Hook for filter test',
      content: 'x',
      source,
    });
    const scheduleRow = await contentKnowledgeRepository.create({
      categories: ['posting_schedule'],
      title: 'Schedule for filter test',
      content: 'x',
      source,
    });
    createdIds.push(hookRow.id, scheduleRow.id);

    const results = await contentKnowledgeRepository.findActive('hook_template');
    const ids = results.map((r) => r.id);
    expect(ids).toContain(hookRow.id);
    expect(ids).not.toContain(scheduleRow.id);
  });

  it('findActive(category) matches a record tagged with multiple categories (D-0033)', async () => {
    const source = testSource();
    const dualTagged = await contentKnowledgeRepository.create({
      categories: ['hook_template', 'headline_rule'],
      title: 'Dual-tagged for filter test',
      content: 'x',
      source,
    });
    createdIds.push(dualTagged.id);

    const byFirstTag = await contentKnowledgeRepository.findActive('hook_template');
    const bySecondTag = await contentKnowledgeRepository.findActive('headline_rule');
    expect(byFirstTag.map((r) => r.id)).toContain(dualTagged.id);
    expect(bySecondTag.map((r) => r.id)).toContain(dualTagged.id);
  });

  it('findBySourceAndTitle supports idempotent seeding — finds an existing row by source+title', async () => {
    const source = testSource();
    const row = await contentKnowledgeRepository.create({
      categories: ['content_strategy'],
      title: 'Idempotency check',
      content: 'x',
      source,
    });
    createdIds.push(row.id);

    const found = await contentKnowledgeRepository.findBySourceAndTitle(source, 'Idempotency check');
    expect(found?.id).toBe(row.id);

    const notFound = await contentKnowledgeRepository.findBySourceAndTitle(source, 'Different title');
    expect(notFound).toBeNull();
  });
});
