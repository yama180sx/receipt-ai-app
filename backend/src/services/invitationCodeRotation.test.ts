import { describe, expect, it } from 'vitest';
import {
  createInvitationCodeRotationPlan,
  invitationCodeDeliveryManifest,
  invitationCodeRollbackManifest,
} from './invitationCodeRotation';

function deterministicRandom(values: number[]) {
  let call = 0;
  return (size: number) => Buffer.alloc(size, values[call++ % values.length] ?? 0);
}

describe('createInvitationCodeRotationPlan', () => {
  it('generates unique replacements that do not reuse current values', () => {
    const plan = createInvitationCodeRotationPlan(
      [
        { familyGroupId: 1, inviteCode: 'previous-a' },
        { familyGroupId: 2, inviteCode: 'previous-b' },
      ],
      'rotation-test-001',
      deterministicRandom([0, 1])
    );

    expect(plan.records).toHaveLength(2);
    expect(new Set(plan.records.map(({ rotatedInviteCode }) => rotatedInviteCode)).size).toBe(2);
    expect(plan.records.map(({ rotatedInviteCode }) => rotatedInviteCode)).not.toContain('previous-a');
    expect(plan.records.map(({ rotatedInviteCode }) => rotatedInviteCode)).not.toContain('previous-b');
  });

  it('keeps previous values out of the delivery manifest', () => {
    const plan = createInvitationCodeRotationPlan(
      [{ familyGroupId: 1, inviteCode: 'previous-a' }],
      'rotation-test-002',
      deterministicRandom([3])
    );

    const delivery = invitationCodeDeliveryManifest(plan);
    const rollback = invitationCodeRollbackManifest(plan);
    expect(JSON.stringify(delivery)).not.toContain('previous-a');
    expect(rollback.codes[0]).toMatchObject({ familyGroupId: 1, previousInviteCode: 'previous-a' });
  });
});
