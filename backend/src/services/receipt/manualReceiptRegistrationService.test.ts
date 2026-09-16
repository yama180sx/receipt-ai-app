import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMemberById: vi.fn(),
  createManualReceipt: vi.fn(),
}));

vi.mock('../../repositories/receiptRepository', () => ({ findMemberById: mocks.findMemberById }));
vi.mock('./receiptUpdateService', () => ({ createManualReceipt: mocks.createManualReceipt }));

import { createManualReceiptForMember } from './manualReceiptRegistrationService';

const actorContext = { familyGroupId: 10, memberId: 1 };
const input = { date: '2026-09-16', storeName: '手入力店', items: [{ name: '品目', price: 100, quantity: 1 }] };

describe('createManualReceiptForMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the existing self-registration behavior', async () => {
    mocks.createManualReceipt.mockResolvedValue({ id: 1 });
    await expect(createManualReceiptForMember(actorContext, undefined, input)).resolves.toEqual({ id: 1 });
    expect(mocks.findMemberById).not.toHaveBeenCalled();
    expect(mocks.createManualReceipt).toHaveBeenCalledWith(actorContext, input);
  });

  it('allows a TOTP-enabled admin to register for a member in the same household', async () => {
    mocks.findMemberById.mockResolvedValueOnce({ id: 1, familyGroupId: 10, role: 'ADMIN', totpEnabled: true });
    mocks.findMemberById.mockResolvedValueOnce({ id: 2, familyGroupId: 10, role: 'USER', totpEnabled: false });
    mocks.createManualReceipt.mockResolvedValue({ id: 2 });

    await expect(createManualReceiptForMember(actorContext, 2, input)).resolves.toEqual({ id: 2 });
    expect(mocks.createManualReceipt).toHaveBeenCalledWith({ familyGroupId: 10, memberId: 2 }, input);
  });

  it('rejects a proxy registration by a non-admin or TOTP-disabled actor', async () => {
    mocks.findMemberById.mockResolvedValueOnce({ id: 1, familyGroupId: 10, role: 'ADMIN', totpEnabled: false });
    mocks.findMemberById.mockResolvedValueOnce({ id: 2, familyGroupId: 10, role: 'USER', totpEnabled: false });

    await expect(createManualReceiptForMember(actorContext, 2, input)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.createManualReceipt).not.toHaveBeenCalled();
  });

  it('does not allow a target outside the actor household', async () => {
    mocks.findMemberById.mockResolvedValueOnce({ id: 1, familyGroupId: 10, role: 'ADMIN', totpEnabled: true });
    mocks.findMemberById.mockResolvedValueOnce({ id: 2, familyGroupId: 99, role: 'USER', totpEnabled: false });

    await expect(createManualReceiptForMember(actorContext, 2, input)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.createManualReceipt).not.toHaveBeenCalled();
  });
});
