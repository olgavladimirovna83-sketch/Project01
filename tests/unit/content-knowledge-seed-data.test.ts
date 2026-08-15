import { describe, expect, it } from 'vitest';
import { entries } from '../../prisma/contentKnowledgeSeedData';

/**
 * Task 9.3 — проверяет форму `entries` (первые записи `ContentKnowledge`)
 * без обращения к БД, не полагаясь на то, что `npm run seed:content-knowledge`
 * реально запускался в конкретном окружении (CI это не гарантирует).
 * Реальная запись в БД проверяется отдельно, синтетическими данными —
 * `tests/integration/content-knowledge.smoke.test.ts`.
 */

describe('contentKnowledgeSeedData entries', () => {
  it('has at least the 15 records loaded in Task 9.3', () => {
    expect(entries.length).toBeGreaterThanOrEqual(15);
  });

  it('every entry has at least one non-empty category tag, and non-empty title/content/source', () => {
    for (const entry of entries) {
      expect(entry.categories.length).toBeGreaterThan(0);
      for (const category of entry.categories) {
        expect(category.trim().length).toBeGreaterThan(0);
      }
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.content.trim().length).toBeGreaterThan(0);
      expect(entry.source.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate (source, title) pairs — the seed script relies on this for idempotency', () => {
    const keys = entries.map((e) => `${e.source}::${e.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('includes entries from both source files named by Olga', () => {
    const sources = new Set(entries.map((e) => e.source));
    expect(sources).toContain('Полное руководство.pdf');
    expect(sources).toContain('Полное руководство дополнительно.pdf');
  });

  it('includes all 7 headline rules from the supplement file', () => {
    const headlineRules = entries.filter(
      (e) => e.categories.includes('headline_rule') && e.source === 'Полное руководство дополнительно.pdf',
    );
    expect(headlineRules).toHaveLength(7);
  });

  it('has at least one entry tagged with more than one category (D-0033)', () => {
    const multiTagged = entries.filter((e) => e.categories.length > 1);
    expect(multiTagged.length).toBeGreaterThan(0);
  });

  it('includes the weekly hook system (7 days, Mon-Sun) from the main guide, Section 1', () => {
    const weekEntries = entries.filter(
      (e) => e.source === 'Полное руководство.pdf' && e.sourceSection.startsWith('Раздел 1,'),
    );
    expect(weekEntries).toHaveLength(7);
  });
});
