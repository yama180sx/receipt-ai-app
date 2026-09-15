import { describe, expect, it } from 'vitest';
import { invitationCodeRotationConfirmation, parseInvitationCodeRotationArgs } from './invitationCodeRotationInput';

const validArgs = [
  '--rotation-id', 'rotation-test-001',
  '--delivery-output-file', '/tmp/delivery.json',
  '--rollback-output-file', '/tmp/rollback.json',
  '--confirm', invitationCodeRotationConfirmation,
];

describe('parseInvitationCodeRotationArgs', () => {
  it('accepts only the fixed all-target confirmation and absolute output paths', () => {
    expect(parseInvitationCodeRotationArgs(validArgs)).toEqual({
      rotationId: 'rotation-test-001',
      deliveryOutputFile: '/tmp/delivery.json',
      rollbackOutputFile: '/tmp/rollback.json',
    });
  });

  it('rejects a missing explicit confirmation or a relative output path', () => {
    expect(() => parseInvitationCodeRotationArgs(validArgs.slice(0, -2))).toThrow('--confirm is required.');
    expect(() => parseInvitationCodeRotationArgs([
      '--rotation-id', 'rotation-test-001',
      '--delivery-output-file', 'delivery.json',
      '--rollback-output-file', '/tmp/rollback.json',
      '--confirm', invitationCodeRotationConfirmation,
    ])).toThrow('Output files must be absolute paths.');
  });
});
