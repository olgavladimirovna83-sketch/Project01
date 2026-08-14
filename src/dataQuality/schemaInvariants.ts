/**
 * Task 5.3 — вторая часть consistency-проверки, предложенная Olga: нарушение
 * уникальности, которая должна была предотвращаться на уровне схемы —
 * [platform, externalUserId] на ExternalAccount (25_DATABASE_SCHEMA.md §53,
 * Task 3.3) и [externalAccountId, externalContentId] на Content (Task 1.1).
 *
 * В отличие от temporalConsistency.ts, это НЕ per-user проверка — уникальность
 * задана на уровне всей таблицы, не в рамках одного аккаунта, поэтому не
 * встроена в AccountDataQualityStatus (getDataQualityStatus(userId)), а
 * отдельная системная проверка (см. GET /api/data-quality, поле
 * schemaInvariantViolations на верхнем уровне ответа, не внутри accounts[]).
 *
 * Честная оговорка: обе уникальности уже enforced Postgres-констрейнтами
 * (@@unique в prisma/schema.prisma) — вставить настоящий дубликат физически
 * невозможно, эта проверка при нормальной работе БД всегда будет пустой.
 * Ценность — defense in depth: если constraint случайно потеряется при
 * будущей миграции или его обойдут raw SQL, эта проверка это заметит,
 * вместо того чтобы молча полагаться на то, что "constraint же есть".
 */

import { contentRepository, externalAccountRepository } from '@/data/repositories';

export interface GroupCount {
  key: string;
  count: number;
}

export interface UniquenessViolation {
  key: string;
  count: number;
}

/** Чистая функция — принимает уже сгруппированные счётчики (из Prisma
 * groupBy, см. репозитории), возвращает только группы, реально нарушающие
 * уникальность (count > 1). Юнит-тестируется на синтетических данных,
 * поскольку живую БД с настоящим дубликатом создать нельзя — констрейнт
 * не позволит. */
export function findUniquenessViolations(groups: GroupCount[]): UniquenessViolation[] {
  return groups.filter((group) => group.count > 1).map(({ key, count }) => ({ key, count }));
}

export interface SchemaInvariantViolations {
  duplicateExternalAccounts: UniquenessViolation[];
  duplicateContent: UniquenessViolation[];
}

export async function checkSchemaInvariants(): Promise<SchemaInvariantViolations> {
  const [externalAccountGroups, contentGroups] = await Promise.all([
    externalAccountRepository.findPlatformExternalUserIdGroupCounts(),
    contentRepository.findExternalContentIdGroupCounts(),
  ]);

  return {
    duplicateExternalAccounts: findUniquenessViolations(externalAccountGroups),
    duplicateContent: findUniquenessViolations(contentGroups),
  };
}
