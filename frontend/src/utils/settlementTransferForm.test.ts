import { describe, expect, it } from 'vitest';
import {
  isTransferFormValid,
  validateSettlementTransferForm,
} from './settlementTransferForm';

describe('validateSettlementTransferForm', () => {
  it('returns no errors for valid input', () => {
    const errors = validateSettlementTransferForm({
      transferFrom: 1,
      transferTo: 2,
      transferAmount: '5000',
    });
    expect(errors).toEqual({});
    expect(isTransferFormValid(errors)).toBe(true);
  });

  it('requires from and to members', () => {
    const errors = validateSettlementTransferForm({
      transferFrom: null,
      transferTo: null,
      transferAmount: '100',
    });
    expect(errors.from).toBeDefined();
    expect(errors.to).toBeDefined();
  });

  it('rejects same from and to member', () => {
    const errors = validateSettlementTransferForm({
      transferFrom: 1,
      transferTo: 1,
      transferAmount: '100',
    });
    expect(errors.to).toContain('異なる');
  });

  it('rejects invalid amount', () => {
    const errors = validateSettlementTransferForm({
      transferFrom: 1,
      transferTo: 2,
      transferAmount: 'abc',
    });
    expect(errors.amount).toBeDefined();
  });
});
