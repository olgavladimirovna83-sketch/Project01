import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/data/prismaClient';
import { externalAccountRepository, userRepository } from '../../src/data/repositories';

/**
 * Task 3.3 smoke test: create/findByUserId/update для ExternalAccount
 * (25_DATABASE_SCHEMA.md §7) против живой БД. Требует живой PostgreSQL
 * (DATABASE_URL) с применёнными миграциями.
 */
describe('external account data flow smoke test', () => {
  let createdUserId: string | undefined;

  afterAll(async () => {
    if (createdUserId) {
      // onDelete: Cascade на ExternalAccount.userId — удаление user убирает
      // и ExternalAccount.
      await prisma.user.delete({ where: { id: createdUserId } });
    }
  });

  it('creates, finds by user, and updates an external account', async () => {
    const user = await userRepository.create({ timezone: 'Europe/Moscow' });
    createdUserId = user.id;

    const account = await externalAccountRepository.create({
      platform: 'instagram',
      externalUserId: `ig-test-${Date.now()}`,
      accessToken: 'fake-access-token',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      user: { connect: { id: user.id } },
    });

    expect(account.status).toBe('connected');

    const found = await externalAccountRepository.findByUserId(user.id);
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(account.id);
    expect(found[0]?.platform).toBe('instagram');

    const updated = await externalAccountRepository.update(account.id, {
      status: 'expired',
      accessToken: 'rotated-access-token',
    });

    expect(updated.status).toBe('expired');
    expect(updated.accessToken).toBe('rotated-access-token');
  });
});
