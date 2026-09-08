import { describe, expect, it } from 'vitest';
import { globalAiBudgetManagerBootstrapConfirmation, parseGlobalAiBudgetManagerBootstrapArgs } from './globalAiBudgetManagerBootstrapInput';

const args = [
  '--member-id', '42',
  '--operator', 't320-deployer',
  '--reason', 'initial production registration',
  '--confirm', globalAiBudgetManagerBootstrapConfirmation,
];

describe('parseGlobalAiBudgetManagerBootstrapArgs', () => {
  it('parses an explicit deployment-only registration payload', () => {
    expect(parseGlobalAiBudgetManagerBootstrapArgs(args)).toEqual({
      memberId: 42,
      operatorName: 't320-deployer',
      reason: 'initial production registration',
    });
  });

  it('requires a positive member ID and the exact confirmation value', () => {
    expect(() => parseGlobalAiBudgetManagerBootstrapArgs(args.map((value) => value === '42' ? '0' : value))).toThrow('--member-id must be a positive integer.');
    expect(() => parseGlobalAiBudgetManagerBootstrapArgs(args.map((value) => value === globalAiBudgetManagerBootstrapConfirmation ? 'yes' : value))).toThrow(`--confirm must be ${globalAiBudgetManagerBootstrapConfirmation}.`);
  });
});
