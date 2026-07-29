import { ProductTypeStatus } from '@prisma/client';
import {
  findProductClassificationReviewItems,
} from '../../repositories/productClassificationRepository';
import { getLocalMonthDateRange, normalizeYearMonth } from '../../utils/yearMonth';

const reviewStatuses = [
  ProductTypeStatus.NEEDS_REVIEW,
  ProductTypeStatus.UNCLASSIFIED,
  ProductTypeStatus.OUTSIDE_INITIAL_SCOPE,
] as const;

const reviewStatusByApiValue = {
  needs_review: ProductTypeStatus.NEEDS_REVIEW,
  unclassified: ProductTypeStatus.UNCLASSIFIED,
  outside_initial_scope: ProductTypeStatus.OUTSIDE_INITIAL_SCOPE,
} as const;

export type ProductClassificationReviewFilters = {
  familyGroupId: number;
  statuses?: string[];
  categoryId?: number;
  month?: string;
};

export function parseProductClassificationReviewStatuses(values?: string[]) {
  if (!values || values.length === 0) return [...reviewStatuses];

  const parsed = values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .map((value) => reviewStatusByApiValue[value as keyof typeof reviewStatusByApiValue])
    .filter((value): value is (typeof reviewStatuses)[number] => Boolean(value));

  return parsed.length > 0 ? [...new Set(parsed)] : [...reviewStatuses];
}

export async function listProductClassificationReviewItems(filters: ProductClassificationReviewFilters) {
  const month = normalizeYearMonth(filters.month);
  const dateRange = month ? getLocalMonthDateRange(month) : undefined;

  return findProductClassificationReviewItems({
    familyGroupId: filters.familyGroupId,
    statuses: parseProductClassificationReviewStatuses(filters.statuses),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : {}),
  });
}
