/**
 * OpenAPI 生成型のエイリアス（docs/openapi/openapi.yaml が正本）
 * schema.ts は `npm run generate:api` で再生成する。
 */
import type { components } from './schema';

type Schemas = components['schemas'];

/** 標準 success envelope（data 付き） */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiMessageResponse = Schemas['ApiMessageEnvelope'];

// --- auth ---
export type ResolvedFamily = Schemas['ResolvedFamily'];
export type AuthFamilyMember = Schemas['AuthFamilyMember'];
export type LoginMember = Schemas['LoginMember'];
export type LoginResponse = Schemas['LoginResponse'];
export type TotpSetupInfo = Schemas['TotpSetupInfo'];
export type LoginRequest = Schemas['LoginRequest'];

// --- receipt ---
export type CategorySummary = Schemas['CategorySummary'];
export type ItemSplitSummary = Schemas['ItemSplitSummary'];
export type ReceiptItemDetail = Schemas['ReceiptItemDetail'];
export type ReceiptDetail = Schemas['ReceiptDetail'];
export type FamilyMemberSummary = Schemas['FamilyMemberSummary'];
export type ReceiptJobListItem = Schemas['ReceiptJobListItem'];
export type ReceiptJobStatus = Schemas['ReceiptJobStatus'];
export type UploadJobResponse = Schemas['UploadJobResponse'];
export type CommitReceiptRequest = Schemas['CommitReceiptRequest'];
export type ItemSplitInput = Schemas['ItemSplitInput'];

// --- stats ---
export type MonthlyStatsData = Schemas['MonthlyStatsData'];
export type AdvancedStatsData = Schemas['AdvancedStatsData'];
export type SettlementStatusData = Schemas['SettlementStatusData'];
export type SettlementMemberSummary = Schemas['SettlementMemberSummary'];
export type SettlementTransfer = Schemas['SettlementTransfer'];
export type CreateSettlementTransferRequest = Schemas['CreateSettlementTransferRequest'];

// --- category ---
export type Category = Schemas['Category'];
export type CreateCategoryRequest = Schemas['CreateCategoryRequest'];
export type OptimizeCategoryResponse = Schemas['OptimizeCategoryResponse'];

// --- productMaster ---
export type ProductMaster = Schemas['ProductMaster'];
export type UpdateProductMasterRequest = Schemas['UpdateProductMasterRequest'];
export type MergeStoreNamesRequest = Schemas['MergeStoreNamesRequest'];
export type MergeStoreNamesResponse = Schemas['MergeStoreNamesResponse'];

// --- admin ---
export type PromptTemplate = Schemas['PromptTemplate'];
export type CreatePromptTemplateRequest = Schemas['CreatePromptTemplateRequest'];
export type UpdatePromptTemplateRequest = Schemas['UpdatePromptTemplateRequest'];
export type AdminCostStatRow = Schemas['AdminCostStatRow'];

// --- health ---
export type HealthResponse = Schemas['HealthResponse'];

export type { components, paths } from './schema';
