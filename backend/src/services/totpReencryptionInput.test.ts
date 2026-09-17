import { describe, expect, it } from 'vitest';
import { parseTotpReencryptionArgs, totpReencryptionConfirmation } from './totpReencryptionInput';

const args = ['--operator', 'root-maintainer', '--reason', 'planned migration', '--confirm', totpReencryptionConfirmation];

describe('parseTotpReencryptionArgs', () => {
  it('明示確認付きの監査入力を解釈する', () => {
    expect(parseTotpReencryptionArgs(args)).toEqual({ operatorName: 'root-maintainer', reason: 'planned migration' });
  });

  it('空値、未知の引数、不正な確認値を拒否する', () => {
    expect(() => parseTotpReencryptionArgs(['--operator', '', '--reason', 'x', '--confirm', totpReencryptionConfirmation])).toThrow('--operator is required.');
    expect(() => parseTotpReencryptionArgs([...args, '--unknown', 'x'])).toThrow('invalid arguments.');
    expect(() => parseTotpReencryptionArgs(args.map((value) => value === totpReencryptionConfirmation ? 'no' : value))).toThrow(`--confirm must be ${totpReencryptionConfirmation}.`);
  });
});
