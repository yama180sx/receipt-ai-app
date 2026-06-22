/**
 * OpenAPI 契約 DTO（docs/openapi/openapi.yaml が正本）
 *
 * FE の frontend/src/api/generated と同型を維持する。
 * 変更時は openapi.yaml → FE generate:api → 本ファイルの突合（apiSchemas.test.ts）の順。
 *
 * ドメイン内部型（Gemini 解析等）は types/receipt.ts を使用すること。
 */

// --- auth ---
export type ResolvedFamily = {
  familyGroupId: number;
  name: string;
};

export type AuthFamilyMember = {
  id: number;
  name: string;
};

export type LoginMember = {
  id: number;
  name: string;
  familyGroupId: number;
  role: string;
  totpEnabled?: boolean;
};

export type LoginResponse = {
  token: string | null;
  pendingToken: string | null;
  member: LoginMember;
  requiresTotpVerification: boolean;
  requiresTotpSetup: boolean;
};

export type TotpSetupInfo = {
  secret: string;
  otpauthUrl: string;
};

// --- receipt ---
export type CategorySummary = {
  id: number;
  name: string;
  color?: string | null;
};

export type ItemSplitSummary = {
  id: number;
  itemId: number;
  familyMemberId: number;
  amount: number;
};

export type ReceiptItemDetail = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  categoryId: number | null;
  category?: CategorySummary | null;
  splits?: ItemSplitSummary[];
};

export type ReceiptDetail = {
  id: number;
  storeName: string;
  date?: string;
  totalAmount: number;
  taxAmount?: number;
  imagePath?: string | null;
  memberId?: number;
  familyGroupId?: number;
  items: ReceiptItemDetail[];
};

export type ReceiptValidation = {
  isSuspicious: boolean;
  warnings: string[];
};

export type ReceiptJobListItem = {
  id: string;
  state: string;
  imagePath: string | null;
  createdAt: number;
  failedReason?: string | null;
  parsedData?: {
    storeName: string;
    purchaseDate: string;
    totalAmount: number;
    taxAmount?: number;
    itemCount: number;
  };
  validation?: ReceiptValidation;
  duplicateSuspected?: boolean;
  existingReceiptId?: number;
};

export type ReceiptJobStatus = {
  id: string;
  state: string;
  result?: Record<string, unknown>;
  error?: string;
  duplicateSuspected?: boolean;
  existingReceiptId?: number | null;
};

export type UploadJobResponse = {
  jobId: string;
  status?: string;
};

export type ItemSplitInput = {
  familyMemberId: number;
  ratio?: number;
  amount?: number;
};

export type FamilyMemberSummary = {
  id: number;
  name: string;
};

// --- stats ---
export type CategoryStatRow = {
  categoryId?: number | null;
  categoryName?: string;
  totalAmount?: number | string;
  color?: string | null;
};

export type MonthlyStatsData = {
  month: string;
  totalAmount: number;
  stats: CategoryStatRow[];
  latestReceipt: ReceiptDetail | null;
};

export type TrendRow = {
  period: string;
  total: number;
  prev_total?: number | null;
};

export type ParetoRow = {
  name: string;
  amount: number | string;
  ratio: number | string;
  cumulative_ratio: number | string;
};

export type AdvancedStatsData = {
  trend: TrendRow[];
  pareto: ParetoRow[];
};

export type SettlementMemberSummary = {
  memberId: number;
  name: string;
  paidAmount: number;
  owedAmount: number;
  balance: number;
};

export type SettlementTransfer = {
  id: number;
  month: string;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  settledAt: string;
};

export type SettlementStatusData = {
  members: SettlementMemberSummary[];
  transfers: SettlementTransfer[];
};

// --- category ---
export type Category = {
  id: number;
  name: string;
  color: string | null;
  keywords: string[];
};

export type OptimizeCategoryResponse = {
  message: string;
  updatedCount?: number;
};

// --- productMaster ---
export type ProductMaster = {
  id: number;
  name: string;
  storeName: string | null;
  categoryId: number | null;
  category?: CategorySummary | null;
};

export type MergeStoreNamesResponse = {
  updatedCount: number;
};

// --- admin ---
export type PromptTemplate = {
  id: number;
  key: string;
  name?: string | null;
  description?: string | null;
  systemPrompt: string;
  domainHints?: Record<string, unknown> | null;
  isActive: boolean;
  version: number;
  familyGroupId?: number;
};

export type AdminCostStatRow = {
  month: string;
  modelId: string;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  estimatedCostJpy: number;
};

// --- health ---
export type HealthResponse = {
  status: string;
  env?: string;
  timestamp?: string;
};

/** OpenAPI components/schemas に存在すべき公開 DTO 名（ドリフト検知用） */
export const API_SCHEMA_EXPORTS = [
  'ResolvedFamily',
  'AuthFamilyMember',
  'LoginMember',
  'LoginResponse',
  'TotpSetupInfo',
  'CategorySummary',
  'ItemSplitSummary',
  'ReceiptItemDetail',
  'ReceiptDetail',
  'ReceiptValidation',
  'ReceiptJobListItem',
  'ReceiptJobStatus',
  'UploadJobResponse',
  'ItemSplitInput',
  'FamilyMemberSummary',
  'CategoryStatRow',
  'MonthlyStatsData',
  'TrendRow',
  'ParetoRow',
  'AdvancedStatsData',
  'SettlementMemberSummary',
  'SettlementTransfer',
  'SettlementStatusData',
  'Category',
  'OptimizeCategoryResponse',
  'ProductMaster',
  'MergeStoreNamesResponse',
  'PromptTemplate',
  'AdminCostStatRow',
  'HealthResponse',
] as const;

export type ApiSchemaExportName = (typeof API_SCHEMA_EXPORTS)[number];
