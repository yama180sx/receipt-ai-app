import type {
  SettlementMemberSummary,
  SettlementStatusData,
  SettlementTransfer,
} from '../types/apiSchemas';
import type { SettlementMemberSummary as SettlementMemberDomain } from '../services/settlement/settlementAggregation';

export type SettlementTransferDomain = {
  id: number;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  month?: string;
  settledAt: Date;
};

export type SettlementStatusDomain = {
  month: string;
  members: SettlementMemberDomain[];
  transfers: SettlementTransferDomain[];
};

export function mapSettlementMemberToApi(member: SettlementMemberDomain): SettlementMemberSummary {
  return member;
}

export function mapSettlementTransferToApi(transfer: SettlementTransferDomain): SettlementTransfer {
  return {
    id: transfer.id,
    fromMemberId: transfer.fromMemberId,
    toMemberId: transfer.toMemberId,
    amount: transfer.amount,
    month: transfer.month,
    settledAt: transfer.settledAt.toISOString(),
  };
}

export function mapSettlementStatusToApi(domain: SettlementStatusDomain): SettlementStatusData {
  return {
    month: domain.month,
    members: domain.members.map(mapSettlementMemberToApi),
    transfers: domain.transfers.map(mapSettlementTransferToApi),
  };
}

export function mapDeletedSettlementTransferToApi(transferId: number) {
  return { id: transferId };
}
