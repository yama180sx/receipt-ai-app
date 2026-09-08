export type BootstrapGlobalAiBudgetManagerInput = {
  memberId: number;
  operatorName: string;
  reason: string;
};

const confirmation = 'bootstrap-global-ai-budget-manager';

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name)?.trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

/** 初期・復旧登録CLIの引数を、既存のデプロイCLIと同じ --name value 形式で検証する。 */
export function parseGlobalAiBudgetManagerBootstrapArgs(args: string[]): BootstrapGlobalAiBudgetManagerInput {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!option?.startsWith('--') || value === undefined || value.startsWith('--')) throw new Error('Options must be supplied as --name value pairs.');
    const name = option.slice(2);
    if (values.has(name)) throw new Error(`--${name} must not be specified more than once.`);
    values.set(name, value);
  }
  const memberIdValue = required(values, 'member-id');
  if (!/^\d+$/.test(memberIdValue) || Number(memberIdValue) <= 0 || !Number.isSafeInteger(Number(memberIdValue))) throw new Error('--member-id must be a positive integer.');
  if (required(values, 'confirm') !== confirmation) throw new Error(`--confirm must be ${confirmation}.`);
  return { memberId: Number(memberIdValue), operatorName: required(values, 'operator'), reason: required(values, 'reason') };
}

export const globalAiBudgetManagerBootstrapConfirmation = confirmation;
