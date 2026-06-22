/**
 * 精算・割勘ドメイン型
 *
 * - DTO: OpenAPI generated の re-export
 * - ViewModel: 割勘エディタ用の画面固有型（OpenAPI 非該当）
 */

import type { ItemSplitSummary } from '../api/generated';

/** OpenAPI DTO（settlement / receipt API） */
export type {
  FamilyMemberSummary,
  ItemSplitInput,
  SettlementMemberSummary,
  SettlementStatusData,
  SettlementTransfer,
} from '../api/generated';

/** 割勘エディタ上の按分レコード（ViewModel — ItemSplitSummary の表示用部分型） */
export type ItemSplitRecord = Pick<ItemSplitSummary, 'familyMemberId' | 'amount'>;

/** 割り勘エディタで扱うレシート明細（ViewModel） */
export type ReceiptItemForSplit = {
  id: number;
  name?: string;
  price?: number;
  quantity?: number;
  splits?: ItemSplitRecord[];
};

/** 履歴から渡される割り勘対象レシート（ViewModel） */
export type ReceiptForSplitEditor = {
  id: number;
  memberId: number;
  imagePath?: string | null;
  storeName?: string;
  items: ReceiptItemForSplit[];
};
