import type { ExternalAccount, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const externalAccountRepository = {
  create(data: Prisma.ExternalAccountCreateInput): Promise<ExternalAccount> {
    return prisma.externalAccount.create({ data });
  },
  // Возвращает массив, не одну запись — пользователь может подключить
  // несколько внешних аккаунтов, в том числе на разных платформах
  // (25_DATABASE_SCHEMA.md §70 FUTURE_MULTI_PLATFORM, Task 3.3).
  findByUserId(userId: string): Promise<ExternalAccount[]> {
    return prisma.externalAccount.findMany({ where: { userId } });
  },
  update(id: string, data: Prisma.ExternalAccountUpdateInput): Promise<ExternalAccount> {
    return prisma.externalAccount.update({ where: { id }, data });
  },
  // Task 5.3 — consistency-проверка (schemaInvariants.ts): счётчики по
  // [platform, externalUserId] — group > 1 нарушал бы @@unique
  // (25_DATABASE_SCHEMA.md §53). Возвращает ВСЕ группы, не только count>1 —
  // фильтрация нарочно вынесена в чистую findUniquenessViolations
  // (schemaInvariants.ts), чтобы саму логику детекции можно было
  // юнит-тестировать на синтетических данных (живой дубликат в реальной
  // БД создать нельзя — constraint не даст).
  async findPlatformExternalUserIdGroupCounts(): Promise<Array<{ key: string; count: number }>> {
    const groups = await prisma.externalAccount.groupBy({
      by: ['platform', 'externalUserId'],
      _count: { id: true },
    });
    return groups.map((g) => ({
      key: `${g.platform}::${g.externalUserId}`,
      count: g._count.id,
    }));
  },
};
