import type { AccountSnapshot, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const accountSnapshotRepository = {
  create(data: Prisma.AccountSnapshotCreateInput): Promise<AccountSnapshot> {
    return prisma.accountSnapshot.create({ data });
  },
  findByExternalAccountId(externalAccountId: string): Promise<AccountSnapshot[]> {
    return prisma.accountSnapshot.findMany({ where: { externalAccountId } });
  },
};
