import type { Prisma, User } from '@prisma/client';
import { prisma } from '../prismaClient';

export const userRepository = {
  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },
  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};
