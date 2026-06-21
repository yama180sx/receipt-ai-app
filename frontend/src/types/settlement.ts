/** OpenAPI 生成 DTO（精算 API） */
export type {
  FamilyMemberSummary,
  SettlementMemberSummary,
  SettlementStatusData,
  SettlementTransfer,
} from '../api/generated';

export type ItemSplitRecord = {
  familyMemberId: number;
  amount: number;
};

/** 割り勘エディタで扱うレシート明細 */
export type ReceiptItemForSplit = {
  id: number;
  name?: string;
  price?: number;
  quantity?: number;
  splits?: ItemSplitRecord[];
};

/** 履歴から渡される割り勘対象レシート */
export type ReceiptForSplitEditor = {
  id: number;
  memberId: number;
  imagePath?: string | null;
  storeName?: string;
  items: ReceiptItemForSplit[];
};

export type ItemSplitSavePayload = {
  familyMemberId: number;
  amount: number;
};
