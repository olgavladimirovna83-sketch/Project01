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
};
