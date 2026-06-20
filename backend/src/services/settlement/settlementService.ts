import { prisma } from '../../utils/prismaClient';
import { AppError } from '../../utils/appError';
import {
  getCurrentYearMonthLocal,
  getLocalMonthDateRange,
  normalizeYearMonth,
} from '../../utils/yearMonth';
import {
  computeSettlementMemberSummaries,
  type SettlementReceiptInput,
} from './settlementAggregation';

export type SettlementItemRow = {
  receiptId: number;
  memberId: number;
  price: number;
  quantity: number;
  splits: { familyMemberId: number; amount: number }[];
};

/** Item 行を receipt 単位にグループ化（集計入力用） */
export function buildSettlementReceiptInputsFromItems(
  rows: SettlementItemRow[]
): SettlementReceiptInput[] {
  const receiptsById = new Map<number, SettlementReceiptInput>();

  for (const row of rows) {
    let receipt = receiptsById.get(row.receiptId);
    if (!receipt) {
      receipt = { memberId: row.memberId, items: [] };
      receiptsById.set(row.receiptId, receipt);
    }

    receipt.items.push({
      price: row.price,
      quantity: row.quantity,
      splits: row.splits,
    });
  }

  return Array.from(receiptsById.values());
}

async function fetchSettlementReceiptInputs(
  familyGroupId: number,
  startDate: Date,
  endDate: Date
): Promise<SettlementReceiptInput[]> {
  const items = await prisma.item.findMany({
    where: {
      receipt: {
        familyGroupId,
        date: { gte: startDate, lt: endDate },
      },
    },
    select: {
      receiptId: true,
      price: true,
      quantity: true,
      receipt: { select: { memberId: true } },
      splits: {
        select: {
          familyMemberId: true,
          amount: true,
        },
      },
    },
  });

  return buildSettlementReceiptInputsFromItems(
    items.map((item) => ({
      receiptId: item.receiptId,
      memberId: item.receipt.memberId,
      price: item.price,
      quantity: item.quantity,
      splits: item.splits,
    }))
  );
}

export type SettlementTransferRecord = {
  id: number;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  settledAt: Date;
};

export type SettlementStatusData = {
  month: string;
  members: ReturnType<typeof computeSettlementMemberSummaries>;
  transfers: SettlementTransferRecord[];
};

/** 月間精算ステータス（暗黙デフォルト ＋ 送金実績反映） */
export async function getSettlementStatusData(
  familyGroupId: number,
  month?: string
): Promise<SettlementStatusData> {
  const targetMonth = normalizeYearMonth(month) ?? getCurrentYearMonthLocal();
  const { start: startDate, end: endDate } = getLocalMonthDateRange(targetMonth);

  const [members, receiptInputs, transfers] = await Promise.all([
    prisma.familyMember.findMany({
      where: { familyGroupId },
      select: { id: true, name: true },
    }),
    fetchSettlementReceiptInputs(familyGroupId, startDate, endDate),
    prisma.settlementTransfer.findMany({
      where: {
        month: targetMonth,
        familyGroupId,
      },
      select: {
        id: true,
        fromMemberId: true,
        toMemberId: true,
        amount: true,
        settledAt: true,
      },
    }),
  ]);

  const memberSummaries = computeSettlementMemberSummaries(
    members,
    receiptInputs,
    transfers.map((t) => ({
      fromMemberId: t.fromMemberId,
      toMemberId: t.toMemberId,
      amount: t.amount,
    }))
  );

  return {
    month: targetMonth,
    members: memberSummaries,
    transfers,
  };
}

export type CreateSettlementTransferInput = {
  month: string;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
};

/** 送金記録の登録 */
export async function createSettlementTransfer(
  familyGroupId: number,
  input: CreateSettlementTransferInput
) {
  const normalizedMonth = normalizeYearMonth(input.month);
  const fromId = Number(input.fromMemberId);
  const toId = Number(input.toMemberId);
  const transferAmount = Math.round(Number(input.amount));

  if (!normalizedMonth || !input.fromMemberId || !input.toMemberId || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    throw new AppError('必要なパラメータが不足しているか、金額が不正です。', 400);
  }

  if (fromId === toId) {
    throw new AppError('自分自身への送金は登録できません。', 400);
  }

  const validMembers = await prisma.familyMember.findMany({
    where: {
      id: { in: [fromId, toId] },
      familyGroupId,
    },
  });

  if (validMembers.length !== 2) {
    throw new AppError('無効なユーザー指定、または権限がありません。', 403);
  }

  return prisma.settlementTransfer.create({
    data: {
      familyGroupId,
      month: normalizedMonth,
      fromMemberId: fromId,
      toMemberId: toId,
      amount: transferAmount,
    },
  });
}

/** 送金記録の取消（物理削除） */
export async function deleteSettlementTransfer(familyGroupId: number, transferId: number) {
  if (!Number.isFinite(transferId) || transferId <= 0) {
    throw new AppError('送金記録IDが不正です。', 400);
  }

  const transfer = await prisma.settlementTransfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) {
    throw new AppError('送金記録が見つかりません。', 404);
  }

  if (transfer.familyGroupId !== familyGroupId) {
    throw new AppError('この送金記録を操作する権限がありません。', 403);
  }

  await prisma.settlementTransfer.delete({ where: { id: transferId } });

  return { id: transferId };
}
