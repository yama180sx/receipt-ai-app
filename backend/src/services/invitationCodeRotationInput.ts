import path from 'node:path';

export type InvitationCodeRotationInput = {
  rotationId: string;
  deliveryOutputFile: string;
  rollbackOutputFile: string;
};

export const invitationCodeRotationConfirmation = 'rotate-all-invitation-codes';

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name)?.trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

/** root helperからだけ渡す、値を受け取らない固定全世帯再発行CLIの入力。 */
export function parseInvitationCodeRotationArgs(args: string[]): InvitationCodeRotationInput {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!option?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error('Options must be supplied as --name value pairs.');
    }
    const name = option.slice(2);
    if (values.has(name)) throw new Error(`--${name} must not be specified more than once.`);
    values.set(name, value);
  }
  if (required(values, 'confirm') !== invitationCodeRotationConfirmation) {
    throw new Error(`--confirm must be ${invitationCodeRotationConfirmation}.`);
  }
  const rotationId = required(values, 'rotation-id');
  if (!/^[a-z0-9][a-z0-9-]{7,79}$/.test(rotationId)) throw new Error('--rotation-id is invalid.');
  const deliveryOutputFile = required(values, 'delivery-output-file');
  const rollbackOutputFile = required(values, 'rollback-output-file');
  for (const outputFile of [deliveryOutputFile, rollbackOutputFile]) {
    if (!path.isAbsolute(outputFile) || outputFile.includes('\0')) throw new Error('Output files must be absolute paths.');
  }
  if (deliveryOutputFile === rollbackOutputFile) throw new Error('Delivery and rollback output files must differ.');
  return { rotationId, deliveryOutputFile, rollbackOutputFile };
}
