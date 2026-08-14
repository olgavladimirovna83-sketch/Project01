import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { checkSchemaInvariants } from '../../src/dataQuality/schemaInvariants';

/**
 * Task 5.3 — против реальной БД. Не gated по Instagram-credentials — не
 * делает сетевых вызовов.
 *
 * Не может проверить "находит настоящий дубликат" против реальной
 * Postgres — @@unique constraints (25_DATABASE_SCHEMA.md §53, Task 1.1/
 * 3.3) физически не позволяют вставить нарушающую строку. Эта ветка
 * покрыта юнит-тестом findUniquenessViolations на синтетических данных
 * (tests/unit/data-quality-schema-invariants.test.ts). Здесь — только
 * подтверждение, что запрос к реальной БД действительно выполняется и
 * (ожидаемо) не находит нарушений, раз констрейнты держат инвариант.
 */

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const userId of createdUserIds) {
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe('checkSchemaInvariants', () => {
  it('finds no violations against the real database (constraints hold)', async () => {
    const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
    createdUserIds.push(user.id);
    const account = await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId: `schema-invariants-${Date.now()}`,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    await prisma.content.create({
      data: {
        userId: user.id,
        externalAccountId: account.id,
        externalContentId: `schema-invariants-post-${Date.now()}`,
        contentType: 'image',
      },
    });

    const result = await checkSchemaInvariants();

    expect(result.duplicateExternalAccounts).toEqual([]);
    expect(result.duplicateContent).toEqual([]);
  });

  it('rejects an actual duplicate [platform, externalUserId] at the database level (the constraint this check backstops)', async () => {
    const user = await prisma.user.create({ data: { timezone: 'Europe/Moscow' } });
    createdUserIds.push(user.id);
    const externalUserId = `schema-invariants-dupe-${Date.now()}`;
    await prisma.externalAccount.create({
      data: {
        userId: user.id,
        platform: 'instagram',
        externalUserId,
        accessToken: 'irrelevant',
        tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    await expect(
      prisma.externalAccount.create({
        data: {
          userId: user.id,
          platform: 'instagram',
          externalUserId,
          accessToken: 'irrelevant',
          tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      }),
    ).rejects.toThrow();
  });
});
