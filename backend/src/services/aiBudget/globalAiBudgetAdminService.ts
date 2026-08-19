import { Prisma } from '@prisma/client';
import { AppError } from '../../utils/appError';
import { createGlobalAiBudgetAudit, findGlobalAiBudgetSetting, upsertGlobalAiBudgetSetting } from '../../repositories/globalAiBudgetRepository';
import { getGlobalAiCostStats } from './globalAiCostService';

export async function getGlobalAiBudgetOverview() {
  return { setting: await findGlobalAiBudgetSetting(), usage: await getGlobalAiCostStats() };
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
