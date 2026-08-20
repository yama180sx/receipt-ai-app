import { AiUsagePurpose, Prisma } from '@prisma/client';
import { queryGlobalAiCostStats } from '../../repositories/apiUsageLogRepository';
import {
  createBudgetReservation,
  findGlobalAiBudgetSetting,
  listActiveBudgetReservations,
  releaseBudgetReservation,
  stopGlobalAiBudget,
} from '../../repositories/globalAiBudgetRepository';
import { AppError } from '../../utils/appError';

const RESERVATION_TTL_MS = 15 * 60_000;

function total(rows: Array<{ estimatedCostJpy: Prisma.Decimal }>): Prisma.Decimal {
  return rows.reduce((sum, row) => sum.plus(row.estimatedCostJpy), new Prisma.Decimal(0));
}

function currentPacificMonth(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const value = (name: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === name)?.value;
  return `${value('year')}-${value('month')}`;
}

/**
 * Paid Tier有効時だけ、全体利用額と未精算予約額を確認してGemini呼出しを許可する。
 * 設定・集計を取得できない場合は安全側で拒否する。
 */
export async function reserveAiBudget(input: {
  purpose: AiUsagePurpose;
  pricingRevisionId?: number;
  maxCostJpy: Prisma.Decimal;
  jobKey: string;
}) {
  const setting = await findGlobalAiBudgetSetting();
  if (!setting?.isEnabled) return undefined;
  if (setting.isStopped) throw new AppError('AI_BUDGET_STOPPED', 503, undefined, 'AI_BUDGET_STOPPED');
  if (!setting.monthlyBudgetJpy || !input.pricingRevisionId) throw new AppError('AI_BUDGET_CONFIGURATION_UNAVAILABLE', 503, undefined, 'AI_BUDGET_CONFIGURATION_UNAVAILABLE');
  try {
    const [usage, reservations] = await Promise.all([queryGlobalAiCostStats(), listActiveBudgetReservations()]);
    const used = total(usage.filter((row) => row.month === currentPacificMonth()));
    const reserved = reservations.reduce((sum, row) => sum.plus(row.reservedCostJpy), new Prisma.Decimal(0));
    if (used.plus(reserved).plus(input.maxCostJpy).greaterThanOrEqualTo(setting.monthlyBudgetJpy)) {
      await stopGlobalAiBudget('monthly_budget_reached');
      throw new AppError('AI_BUDGET_STOPPED', 503, undefined, 'AI_BUDGET_STOPPED');
    }
    return createBudgetReservation({ ...input, pricingRevisionId: input.pricingRevisionId, reservedCostJpy: input.maxCostJpy, expiresAt: new Date(Date.now() + RESERVATION_TTL_MS) });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('AI_BUDGET_CONFIGURATION_UNAVAILABLE', 503, undefined, 'AI_BUDGET_CONFIGURATION_UNAVAILABLE');
  }
}

export async function releaseAiBudgetReservation(jobKey: string) {
  await releaseBudgetReservation(jobKey);
}
