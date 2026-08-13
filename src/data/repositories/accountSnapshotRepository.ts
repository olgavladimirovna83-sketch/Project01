import type { AccountSnapshot, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const accountSnapshotRepository = {
  create(data: Prisma.AccountSnapshotCreateInput): Promise<AccountSnapshot> {
    return prisma.accountSnapshot.create({ data });
  },
  findByExternalAccountId(externalAccountId: string): Promise<AccountSnapshot[]> {
    return prisma.accountSnapshot.findMany({ where: { externalAccountId } });
  },
  // Task 5.1 — data quality status: "когда последний раз обновлялись
  // account-level данные" без загрузки всей истории снимков.
  async findLatestCapturedAt(externalAccountId: string): Promise<Date | null> {
    const latest = await prisma.accountSnapshot.findFirst({
      where: { externalAccountId },
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    });
    return latest?.capturedAt ?? null;
  },
};
