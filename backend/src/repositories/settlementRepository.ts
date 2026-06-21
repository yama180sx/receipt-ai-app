import { prisma } from '../utils/prismaClient';
import { listFamilyMembers } from './receiptRepository';

export type SettlementItemQueryRow = {
  receiptId: number;
  price: number;
  quantity: number;
  receipt: { memberId: number };
  splits: { familyMemberId: number; amount: number }[];
};

export async function findSettlementItemsInRange(
  familyGroupId: number,
  startDate: Date,
  endDate: Date
): Promise<SettlementItemQueryRow[]> {
  return prisma.item.findMany({
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
}

export async function listFamilyMembersForSettlement(familyGroupId: number) {
  return listFamilyMembers(familyGroupId);
}

export async function findSettlementTransfersByMonth(familyGroupId: number, month: string) {
  return prisma.settlementTransfer.findMany({
    where: { month, familyGroupId },
    select: {
      id: true,
      fromMemberId: true,
      toMemberId: true,
      amount: true,
      settledAt: true,
    },
  });
}

export async function findFamilyMembersByIds(familyGroupId: number, ids: number[]) {
  return prisma.familyMember.findMany({
    where: { id: { in: ids }, familyGroupId },
  });
}

export async function createSettlementTransferRecord(input: {
  familyGroupId: number;
  month: string;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
}) {
  return prisma.settlementTransfer.create({ data: input });
}

export async function findSettlementTransferById(transferId: number) {
  return prisma.settlementTransfer.findUnique({ where: { id: transferId } });
}

export async function deleteSettlementTransferById(transferId: number) {
  return prisma.settlementTransfer.delete({ where: { id: transferId } });
}
