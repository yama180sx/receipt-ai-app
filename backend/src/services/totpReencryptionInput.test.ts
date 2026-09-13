import { describe, expect, it } from 'vitest';
import {
  parseTotpReencryptionArgs,
  totpReencryptionConfirmation,
} from './totpReencryptionInput';

const args = [
  '--operator', 'root-maintainer',
  '--reason', 'planned key separation',
  '--confirm', totpReencryptionConfirmation,
];

describe('parseTotpReencryptionArgs', () => {
  it('明示確認付きの値なし監査入力を解釈する', () => {
    expect(parseTotpReencryptionArgs(args)).toEqual({
      operatorName: 'root-maintainer',
      reason: 'planned key separation',
    });
  });

  it('確認値、空値、未知の引数を拒否する', () => {
    expect(() => parseTotpReencryptionArgs(args.map((value) =>
      value === totpReencryptionConfirmation ? 'yes' : value
    ))).toThrow(`--confirm must be ${totpReencryptionConfirmation}.`);
    expect(() => parseTotpReencryptionArgs(['--operator', '', '--reason', 'x', '--confirm', totpReencryptionConfirmation]))
      .toThrow('--operator is required.');
    expect(() => parseTotpReencryptionArgs([...args, '--unexpected', 'x']))
      .toThrow('invalid arguments.');
  });
});
