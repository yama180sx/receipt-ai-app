export type TotpReencryptionInput = {
  operatorName: string;
  reason: string;
};

export const totpReencryptionConfirmation = 'reencrypt-totp-secrets';

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name)?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

/** root専用CLIの意図しない実行を防ぐ、値を出さない引数検証。 */
export function parseTotpReencryptionArgs(args: string[]): TotpReencryptionInput {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name || value === undefined || !['--operator', '--reason', '--confirm'].includes(name)) {
      throw new Error('invalid arguments.');
    }
    if (values.has(name)) throw new Error('duplicate argument.');
    values.set(name, value);
  }

  const operatorName = required(values, '--operator');
  const reason = required(values, '--reason');
  if (operatorName.length > 128) throw new Error('--operator is too long.');
  if (reason.length > 1000) throw new Error('--reason is too long.');
  if (values.get('--confirm') !== totpReencryptionConfirmation) {
    throw new Error(`--confirm must be ${totpReencryptionConfirmation}.`);
  }
  return { operatorName, reason };
}
