import type { Experiment, Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';

export const experimentRepository = {
  create(data: Prisma.ExperimentCreateInput): Promise<Experiment> {
    return prisma.experiment.create({ data });
  },
  findById(id: string): Promise<Experiment | null> {
    return prisma.experiment.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.ExperimentUpdateInput): Promise<Experiment> {
    return prisma.experiment.update({ where: { id }, data });
  },
};
