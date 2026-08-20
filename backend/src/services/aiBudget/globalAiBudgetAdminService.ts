import { Prisma } from '@prisma/client';
import { AppError } from '../../utils/appError';
import { addGlobalAiBudgetManager, createGlobalAiBudgetAudit, findEligibleGlobalAiBudgetManagerMember, findGlobalAiBudgetSetting, listGlobalAiBudgetManagers, removeGlobalAiBudgetManager, resumeGlobalAiBudget, upsertGlobalAiBudgetSetting } from '../../repositories/globalAiBudgetRepository';
import { getGlobalAiCostStats } from './globalAiCostService';

export async function getGlobalAiBudgetOverview() {
  return { setting: await findGlobalAiBudgetSetting(), usage: await getGlobalAiCostStats() };
}

export async function getGlobalAiBudgetManagers() { return listGlobalAiBudgetManagers(); }

export async function addAiBudgetManager(actorMemberId: number, memberId: number, reason: string) {
  if (!reason.trim()) throw new AppError('変更理由は必須です。', 400);
  const member = await findEligibleGlobalAiBudgetManagerMember(memberId);
  if (!member) throw new AppError('対象者はTOTP有効なADMINである必要があります。', 400);
  try {
    const manager = await addGlobalAiBudgetManager(memberId);
    await createGlobalAiBudgetAudit({ actorMemberId, action: 'manager_added', reason, afterValue: { memberId } });
    return manager;
  } catch { throw new AppError('対象者は既に全体AI予算管理者です。', 409); }
}

export async function removeAiBudgetManager(actorMemberId: number, memberId: number, reason: string) {
  if (!reason.trim()) throw new AppError('変更理由は必須です。', 400);
  const removed = await removeGlobalAiBudgetManager(memberId);
  if (!removed) throw new AppError('最後の全体AI予算管理者は削除できません。', 409);
  await createGlobalAiBudgetAudit({ actorMemberId, action: 'manager_removed', reason, beforeValue: { memberId } });
}

export async function resumeAiBudget(actorMemberId: number, reason: string) {
  if (!reason.trim()) throw new AppError('再開理由は必須です。', 400);
  return resumeGlobalAiBudget(actorMemberId, reason);
}

export async function updateGlobalAiBudgetSetting(actorMemberId: number, input: { isEnabled: boolean; monthlyBudgetJpy: number; warningPercent?: number; criticalPercent?: number; stopPercent?: number; reason: string }) {
  if (!input.reason?.trim()) throw new AppError('変更理由は必須です。', 400);
  const warningPercent = input.warningPercent ?? 50, criticalPercent = input.criticalPercent ?? 80, stopPercent = input.stopPercent ?? 100;
  if (!(input.monthlyBudgetJpy > 0) || !(0 < warningPercent && warningPercent < criticalPercent && criticalPercent < stopPercent)) throw new AppError('予算またはしきい値が不正です。', 400);
  const before = await findGlobalAiBudgetSetting();
  const setting = await upsertGlobalAiBudgetSetting({ isEnabled: input.isEnabled, monthlyBudgetJpy: new Prisma.Decimal(input.monthlyBudgetJpy), warningPercent, criticalPercent, stopPercent });
  // Decimal/Date を Prisma JSON 型へ安全なプリミティブに正規化する。
  const snapshot = (value: unknown) => value == null ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  await createGlobalAiBudgetAudit({ actorMemberId, action: 'setting_updated', reason: input.reason, beforeValue: snapshot(before), afterValue: snapshot(setting) });
  return setting;
}
