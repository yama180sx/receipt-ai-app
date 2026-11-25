import { describe, expect, it, vi } from 'vitest';
import { ensureVerificationUserPrompts } from '../prisma/verificationUserPrompts';

describe('ensureVerificationUserPrompts', () => {
  it('adds only missing prompts to the selected household and preserves existing ones', async () => {
    const findFirst = vi.fn().mockImplementation(async ({ where }) => where.key === 'RECEIPT_ANALYSIS' ? { id: 12 } : null);
    const create = vi.fn().mockResolvedValue({});
    const tx = { promptTemplate: { findFirst, create } };

    await ensureVerificationUserPrompts(tx, 3);

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst.mock.calls.every(([args]) => args.where.familyGroupId === 3)).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toMatchObject({ familyGroupId: 3, key: 'PRODUCT_CLASSIFICATION' });
  });
});
