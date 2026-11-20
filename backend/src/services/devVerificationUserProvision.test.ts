import { describe, expect, it, vi } from 'vitest';
import {
  devVerificationFamilyName,
  devVerificationMemberName,
  provisionDevVerificationUser,
  type DevVerificationUserProvisionRepository,
} from './devVerificationUserProvision';

function repository(overrides: Partial<DevVerificationUserProvisionRepository> = {}): DevVerificationUserProvisionRepository {
  return {
    findVerificationFamilies: vi.fn().mockResolvedValue([]),
    findFamilyByInviteCode: vi.fn().mockResolvedValue(null),
    createFamilyWithUser: vi.fn().mockResolvedValue({ id: 2, name: devVerificationMemberName, role: 'USER' }),
    ...overrides,
  };
}

const input = { inviteCode: 'RC-DEV-VERIFY-2026', password: 'long-enough-test-password' };

describe('provisionDevVerificationUser', () => {
  it('creates the dedicated family when no canonical family or invite-code conflict exists', async () => {
    const store = repository();
    const hashPassword = vi.fn().mockResolvedValue('hash');

    await expect(provisionDevVerificationUser(input, store, hashPassword)).resolves.toEqual({ status: 'CREATED', memberId: 2 });
    expect(hashPassword).toHaveBeenCalledWith(input.password);
    expect(store.createFamilyWithUser).toHaveBeenCalledWith({ inviteCode: input.inviteCode, passwordHash: 'hash' });
  });

  it('does not create another user when a canonical verification user exists with another invite code', async () => {
    const store = repository({
      findVerificationFamilies: vi.fn().mockResolvedValue([{
        id: 1,
        name: devVerificationFamilyName,
        members: [{ id: 2, name: devVerificationMemberName, role: 'USER' }],
      }]),
    });
    const hashPassword = vi.fn();

    await expect(provisionDevVerificationUser(input, store, hashPassword)).resolves.toEqual({ status: 'ALREADY_EXISTS', memberId: 2 });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(store.findFamilyByInviteCode).not.toHaveBeenCalled();
    expect(store.createFamilyWithUser).not.toHaveBeenCalled();
  });

  it('refuses to use an invite code already assigned to another family', async () => {
    const store = repository({
      findFamilyByInviteCode: vi.fn().mockResolvedValue({
        id: 1,
        name: '別世帯',
        members: [{ id: 2, name: devVerificationMemberName, role: 'ADMIN' }],
      }),
    });

    await expect(provisionDevVerificationUser(input, store, vi.fn())).rejects.toThrow(
      'Verification-user provision target conflicts with existing data.'
    );
  });

  it('refuses to choose among multiple canonical verification families', async () => {
    const store = repository({
      findVerificationFamilies: vi.fn().mockResolvedValue([
        { id: 1, name: devVerificationFamilyName, members: [{ id: 2, name: devVerificationMemberName, role: 'USER' }] },
        { id: 3, name: devVerificationFamilyName, members: [{ id: 4, name: devVerificationMemberName, role: 'USER' }] },
      ]),
    });

    await expect(provisionDevVerificationUser(input, store, vi.fn())).rejects.toThrow(
      'Verification-user provision target conflicts with existing data.'
    );
    expect(store.createFamilyWithUser).not.toHaveBeenCalled();
  });

  it('rejects invalid values before hashing or writing', async () => {
    const store = repository();
    const hashPassword = vi.fn();

    await expect(provisionDevVerificationUser({ inviteCode: 'bad value', password: 'short' }, store, hashPassword))
      .rejects.toThrow('Verification-user provision input is invalid.');
    expect(hashPassword).not.toHaveBeenCalled();
    expect(store.createFamilyWithUser).not.toHaveBeenCalled();
  });
});
