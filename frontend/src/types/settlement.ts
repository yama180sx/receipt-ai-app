/** API 成功レスポンス（精算・按分ドメイン） */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type FamilyMemberSummary = {
  id: number;
  name: string;
};

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

export type SettlementMemberSummary = {
  memberId: number;
  name: string;
  totalPaid: number;
  totalOwed: number;
  baseBalance: number;
  transferredOut: number;
  transferredIn: number;
  balance: number;
};

export type SettlementTransfer = {
  id: number;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  settledAt: string;
};

export type SettlementStatusData = {
  month: string;
  members: SettlementMemberSummary[];
  transfers: SettlementTransfer[];
};
