import {
  deleteReceiptById as deleteReceiptInRepository,
  findLatestReceipt,
  findReceipts,
  listFamilyMembers as listFamilyMembersInRepository,
  type ListReceiptsParams,
  findProductClassificationReviewItems,
  type ReviewItemsParams,
} from '../../repositories/receiptRepository';
import { ProductTypeStatus } from '@prisma/client';
import { AppError } from '../../utils/appError';

export type { ListReceiptsParams };

const REVIEW_STATUSES = [
  ProductTypeStatus.NEEDS_REVIEW,
  ProductTypeStatus.UNCLASSIFIED,
  ProductTypeStatus.OUTSIDE_INITIAL_SCOPE,
] as const;

export type ProductClassificationReviewQuery = {
  familyGroupId: number;
  statuses?: string[];
  categoryId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parsePositiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${name}は正の整数で指定してください。`, 400);
  }
  return parsed;
}

function parseReviewDate(value: string | undefined, endOfDay: boolean) {
  if (!value) return undefined;
  if (!DATE_PATTERN.test(value)) {
    throw new AppError('期間はYYYY-MM-DD形式で指定してください。', 400);
  }
  const [year, month, day] = value.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new AppError('期間に有効な日付を指定してください。', 400);
  }
  const suffix = endOfDay ? 'T23:59:59.999+09:00' : 'T00:00:00.000+09:00';
  const parsed = new Date(`${value}${suffix}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('期間に有効な日付を指定してください。', 400);
  }
  return parsed;
}

export async function listProductClassificationReviewItems(
  query: ProductClassificationReviewQuery
) {
  const statuses = query.statuses?.length
    ? query.statuses.map((status) => {
        const prismaStatus = status.toUpperCase() as ProductTypeStatus;
        if (!REVIEW_STATUSES.includes(prismaStatus as (typeof REVIEW_STATUSES)[number])) {
          throw new AppError('対象外の商品分類状態が指定されています。', 400);
        }
        return prismaStatus;
      })
    : [...REVIEW_STATUSES];
  const page = parsePositiveInteger(query.page, 1, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 'limit');
  if (limit > 100) throw new AppError('limitは100以下で指定してください。', 400);

  const categoryId = query.categoryId
    ? parsePositiveInteger(query.categoryId, 0, 'categoryId')
    : undefined;
  const from = parseReviewDate(query.from, false);
  const to = parseReviewDate(query.to, true);
  if (from && to && from > to) {
    throw new AppError('期間の開始日は終了日以前にしてください。', 400);
  }

  const result = await findProductClassificationReviewItems({
    familyGroupId: query.familyGroupId,
    statuses,
    categoryId,
    from,
    to,
    page,
    limit,
  } satisfies ReviewItemsParams);

  return {
    ...result,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
}

export async function listReceipts(params: ListReceiptsParams) {
  return findReceipts(params);
}

export async function getLatestReceipt(familyGroupId: number) {
  return findLatestReceipt(familyGroupId);
}

export async function deleteReceiptById(receiptId: number, familyGroupId: number) {
  return deleteReceiptInRepository(receiptId, familyGroupId);
}

export async function listFamilyMembers(familyGroupId: number) {
  return listFamilyMembersInRepository(familyGroupId);
}
