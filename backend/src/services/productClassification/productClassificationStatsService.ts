import { ProductTypeStatus } from '@prisma/client';
import { findProductClassificationStatsItems } from '../../repositories/productClassificationRepository';
import { getLocalMonthDateRange, normalizeYearMonth } from '../../utils/yearMonth';
import { AppError } from '../../utils/appError';

type StatRow = { totalAmount: number; itemCount: number };
type CategoryStat = StatRow & { standardCategoryId: number; standardCategoryName: string; parentCategoryName: string; productTypes: Map<number, StatRow & { productTypeId: number; productTypeName: string }> };

export async function getProductClassificationStats(familyGroupId: number, month: string) {
  const normalizedMonth = normalizeYearMonth(month);
  if (!normalizedMonth) throw new AppError('InvalidMonth', 400);
  const { start, end } = getLocalMonthDateRange(normalizedMonth);
  const items = await findProductClassificationStatsItems(familyGroupId, start, end);
  const categories = new Map<number, CategoryStat>();
  const unresolved = new Map<ProductTypeStatus, StatRow>();

  for (const item of items) {
    const totalAmount = item.price * item.quantity;
    if (item.productType && item.productTypeStatus === ProductTypeStatus.CLASSIFIED) {
      const category = item.productType.standardCategory;
      const categoryStat = categories.get(category.id) ?? {
        standardCategoryId: category.id, standardCategoryName: category.name,
        parentCategoryName: category.parent?.name ?? category.name,
        totalAmount: 0, itemCount: 0, productTypes: new Map(),
      };
      categoryStat.totalAmount += totalAmount;
      categoryStat.itemCount += 1;
      const typeStat = categoryStat.productTypes.get(item.productType.id) ?? {
        productTypeId: item.productType.id, productTypeName: item.productType.name, totalAmount: 0, itemCount: 0,
      };
      typeStat.totalAmount += totalAmount;
      typeStat.itemCount += 1;
      categoryStat.productTypes.set(item.productType.id, typeStat);
      categories.set(category.id, categoryStat);
      continue;
    }
    if (item.productTypeStatus !== ProductTypeStatus.NOT_APPLICABLE) {
      const statusStat = unresolved.get(item.productTypeStatus) ?? { totalAmount: 0, itemCount: 0 };
      statusStat.totalAmount += totalAmount;
      statusStat.itemCount += 1;
      unresolved.set(item.productTypeStatus, statusStat);
    }
  }

  return {
    month: normalizedMonth,
    categoryStats: [...categories.values()].map(({ productTypes, ...category }) => ({
      ...category,
      productTypes: [...productTypes.values()].sort((a, b) => b.totalAmount - a.totalAmount),
    })).sort((a, b) => b.totalAmount - a.totalAmount),
    unresolved: [...unresolved.entries()].map(([status, stat]) => ({ status: status.toLowerCase(), ...stat })),
  };
}
