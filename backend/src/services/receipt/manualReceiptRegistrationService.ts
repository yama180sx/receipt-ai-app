import { findMemberById } from '../../repositories/receiptRepository';
import type { TenantContext } from '../../utils/context';
import { AppError } from '../../utils/appError';
import { createManualReceipt, type ManualReceiptInput } from './receiptUpdateService';

/**
 * 手入力レシートの登録先を決定する。
 * 本人登録は既存の JWT + tenant 認可を維持し、代理登録だけを TOTP 済み ADMIN に限定する。
 */
export async function createManualReceiptForMember(
  actorContext: TenantContext,
  requestedMemberId: number | undefined,
  input: ManualReceiptInput
) {
  const targetMemberId = requestedMemberId ?? actorContext.memberId;

  if (targetMemberId !== actorContext.memberId) {
    const [actor, target] = await Promise.all([
      findMemberById(actorContext.memberId),
      findMemberById(targetMemberId),
    ]);
    if (actor?.role !== 'ADMIN' || !actor.totpEnabled) {
      throw new AppError('代理登録は二要素認証済みの管理者だけが実行できます。', 403);
    }
    if (!target || target.familyGroupId !== actorContext.familyGroupId) {
      throw new AppError('登録先メンバーが見つかりません。', 404);
    }
  }

  return createManualReceipt({ ...actorContext, memberId: targetMemberId }, input);
}
