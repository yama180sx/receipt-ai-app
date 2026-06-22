import type { Job } from 'bullmq';
import type { Category, ItemSplit } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  AdvancedStatsData,
  CategoryStatRow,
  CategorySummary,
  FamilyMemberSummary,
  ItemSplitSummary,
  MonthlyStatsData,
  ReceiptDetail,
  ReceiptItemDetail,
  ReceiptJobListItem,
  ReceiptJobStatus,
  UploadJobResponse,
} from '../types/apiSchemas';
import {
  receiptWithItemsCategory,
  receiptWithItemsCategorySplits,
} from '../repositories/receipt/receiptIncludes';
import { checkDuplicateReceipt } from '../services/duplicateReceiptService';

export type ReceiptWithItemsCategorySplits = Prisma.ReceiptGetPayload<{
  include: typeof receiptWithItemsCategorySplits;
}>;

export type ReceiptWithItemsCategory = Prisma.ReceiptGetPayload<{
  include: typeof receiptWithItemsCategory;
}>;

export type ReceiptItemWithCategory = Prisma.ItemGetPayload<{
  include: { category: true };
}>;

export type ReceiptItemWithCategorySplits = Prisma.ItemGetPayload<{
  include: { category: true; splits: true };
}>;

type AnalyzeJobReturn = {
  parsedData?: {
    storeName?: string;
    purchaseDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    items?: unknown[];
  };
  imagePath?: string;
  validation?: { isSuspicious: boolean; warnings: string[] };
};

type MonthlyStatsDomain = {
  month: string;
  totalAmount: number;
  stats: CategoryStatRow[];
  latestReceipt: ReceiptWithItemsCategory | null;
};

type AdvancedStatsDomain = {
  trend: AdvancedStatsData['trend'];
  pareto: AdvancedStatsData['pareto'];
};

function toIsoDateString(date: Date | string | null | undefined): string | undefined {
  if (date == null) return undefined;
  if (date instanceof Date) return date.toISOString();
  return String(date);
}

export function mapCategoryToSummary(category: Category | null | undefined): CategorySummary | null {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    color: category.color,
  };
}

export function mapCategoriesToSummary(categories: Category[]): CategorySummary[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
  }));
}

export function mapItemSplitToSummary(split: ItemSplit): ItemSplitSummary {
  return {
    id: split.id,
    itemId: split.itemId,
    familyMemberId: split.familyMemberId,
    amount: split.amount,
  };
}

export function mapItemSplitsToSummary(splits: ItemSplit[]): ItemSplitSummary[] {
  return splits.map(mapItemSplitToSummary);
}

export function mapReceiptItemToDetail(
  item: ReceiptItemWithCategory | ReceiptItemWithCategorySplits
): ReceiptItemDetail {
  const splits = 'splits' in item && Array.isArray(item.splits) ? item.splits : undefined;
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    categoryId: item.categoryId,
    category: mapCategoryToSummary(item.category),
    splits: splits ? mapItemSplitsToSummary(splits) : undefined,
  };
}

export function mapReceiptToDetail(
  receipt: ReceiptWithItemsCategorySplits | ReceiptWithItemsCategory | null | undefined
): ReceiptDetail | null {
  if (!receipt) return null;

  return {
    id: receipt.id,
    storeName: receipt.storeName,
    date: toIsoDateString(receipt.date),
    totalAmount: receipt.totalAmount,
    taxAmount: receipt.taxAmount,
    imagePath: receipt.imagePath,
    memberId: receipt.memberId,
    familyGroupId: receipt.familyGroupId,
    items: receipt.items.map(mapReceiptItemToDetail),
  };
}

export function mapReceiptList(
  receipts: ReceiptWithItemsCategorySplits[] | ReceiptWithItemsCategory[]
): ReceiptDetail[] {
  return receipts.map((receipt) => mapReceiptToDetail(receipt)!);
}

export function mapFamilyMemberToSummary(member: { id: number; name: string }): FamilyMemberSummary {
  return { id: member.id, name: member.name };
}

export function mapFamilyMembersToSummary(
  members: Array<{ id: number; name: string }>
): FamilyMemberSummary[] {
  return members.map(mapFamilyMemberToSummary);
}

export function mapUploadJobResponse(jobId: string | number | undefined): UploadJobResponse {
  return { jobId: String(jobId ?? '') };
}

export function mapItemSplitsUpdateResult(
  result: ItemSplit[] | { message: string }
): ItemSplitSummary[] | { message: string } {
  if (Array.isArray(result)) {
    return mapItemSplitsToSummary(result);
  }
  return result;
}

export function mapMonthlyStatsToApi(domain: MonthlyStatsDomain): MonthlyStatsData {
  return {
    month: domain.month,
    totalAmount: domain.totalAmount,
    stats: domain.stats,
    latestReceipt: mapReceiptToDetail(domain.latestReceipt),
  };
}

export function mapAdvancedStatsToApi(domain: AdvancedStatsDomain): AdvancedStatsData {
  return domain;
}

function summarizeParsedData(parsedData: AnalyzeJobReturn['parsedData']) {
  if (!parsedData) return undefined;
  return {
    storeName: String(parsedData.storeName ?? ''),
    purchaseDate: String(parsedData.purchaseDate ?? ''),
    totalAmount: Math.round(Number(parsedData.totalAmount ?? 0)),
    taxAmount: parsedData.taxAmount != null ? Number(parsedData.taxAmount) : undefined,
    itemCount: Array.isArray(parsedData.items) ? parsedData.items.length : 0,
  };
}

export function mapJobToStatus(job: Job, state: string): ReceiptJobStatus {
  return {
    id: String(job.id),
    state,
    result:
      job.returnvalue && typeof job.returnvalue === 'object'
        ? (job.returnvalue as Record<string, unknown>)
        : undefined,
    error: job.failedReason ?? undefined,
  };
}

export function applyDuplicateFlagsToJobStatus(
  payload: ReceiptJobStatus,
  flags: { duplicateSuspected: boolean; existingReceiptId?: number | null }
): ReceiptJobStatus {
  return {
    ...payload,
    duplicateSuspected: flags.duplicateSuspected,
    existingReceiptId: flags.existingReceiptId ?? null,
  };
}

export async function mapReceiptJobToListItem(
  job: Job,
  familyGroupId: number
): Promise<ReceiptJobListItem> {
  const state = await job.getState();
  const imagePath =
    typeof job.data?.imagePath === 'string'
      ? job.data.imagePath.replace(/\\/g, '/')
      : null;

  const base: ReceiptJobListItem = {
    id: String(job.id),
    state,
    imagePath,
    createdAt: job.timestamp,
    failedReason: state === 'failed' ? job.failedReason ?? null : undefined,
  };

  if (state !== 'completed' || !job.returnvalue) {
    return base;
  }

  const result = job.returnvalue as AnalyzeJobReturn;
  const parsedData = result.parsedData;
  const validation = result.validation;

  const duplicate = parsedData
    ? await checkDuplicateReceipt(
        familyGroupId,
        parsedData,
        result.imagePath ?? imagePath
      )
    : { duplicateSuspected: false };

  return {
    ...base,
    parsedData: summarizeParsedData(parsedData),
    validation: validation
      ? {
          isSuspicious: Boolean(validation.isSuspicious),
          warnings: validation.warnings ?? [],
        }
      : undefined,
    duplicateSuspected: duplicate.duplicateSuspected,
    existingReceiptId: duplicate.existingReceiptId,
  };
}
