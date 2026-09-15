import {
  applyInvitationCodeRotation,
  listInvitationCodeRotationTargets,
  recordFailedInvitationCodeRotation,
  rollbackInvitationCodes,
} from '../repositories/invitationCodeRotationRepository';
import { createInvitationCodeRotationPlan } from './invitationCodeRotation';
import type { InvitationCodeRollbackManifest } from './invitationCodeRotation';

export async function prepareInvitationCodeRotation(rotationId: string) {
  const targets = await listInvitationCodeRotationTargets();
  return createInvitationCodeRotationPlan(targets, rotationId);
}

export async function executeInvitationCodeRotation(plan: Awaited<ReturnType<typeof prepareInvitationCodeRotation>>) {
  return applyInvitationCodeRotation(plan);
}

export async function recordInvitationCodeRotationFailure(rotationId: string, targetCount: number) {
  try {
    await recordFailedInvitationCodeRotation(rotationId, targetCount);
  } catch {
    // 接続障害時は値なし監査の追加にも失敗し得る。呼び出し元の安全な失敗結果を優先する。
  }
}

export async function executeInvitationCodeRollback(manifest: InvitationCodeRollbackManifest) {
  return rollbackInvitationCodes(manifest);
}
