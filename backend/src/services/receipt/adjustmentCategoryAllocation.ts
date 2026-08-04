import { calcItemLineTotal } from '../../utils/itemLineTotal';

export type CategoryAllocationItem = {
  receiptId: number;
  price: number;
  quantity: number;
  category: { id: number; name: string; color: string | null; isAdjustment: boolean } | null;
};

export type AllocatedCategoryStat = {
  categoryId: number | null;
  categoryName: string | null;
  color: string | null;
  totalAmount: number;
};

type CategoryBucket = AllocatedCategoryStat & { amount: number };

function addAmount(
  buckets: Map<string, CategoryBucket>,
  category: CategoryAllocationItem['category'],
  amount: number
) {
  const key = category ? String(category.id) : 'uncategorized';
  const current = buckets.get(key) ?? {
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    color: category?.color ?? null,
    totalAmount: 0,
    amount: 0,
  };
  current.amount += amount;
  current.totalAmount = current.amount;
  buckets.set(key, current);
}

/**
 * Issue #114-9: 調整Categoryの負額を、同一レシートの正額通常Categoryへ金額比で配賦する。
 * 配賦しきれない調整額は調整Category自身に残す。端数は最大額Category（同額ならID昇順）へ寄せる。
 */
export function allocateAdjustmentsToCategories(items: CategoryAllocationItem[]): AllocatedCategoryStat[] {
  const byReceipt = new Map<number, CategoryAllocationItem[]>();
  for (const item of items) {
    const receiptItems = byReceipt.get(item.receiptId) ?? [];
    receiptItems.push(item);
    byReceipt.set(item.receiptId, receiptItems);
  }

  const totals = new Map<string, CategoryBucket>();
  for (const receiptItems of byReceipt.values()) {
    const normalCategories = new Map<number, { category: NonNullable<CategoryAllocationItem['category']>; amount: number }>();
    const adjustments: Array<{ item: CategoryAllocationItem; amount: number }> = [];

    for (const item of receiptItems) {
      const amount = calcItemLineTotal(item.price, item.quantity);
      if (item.category?.isAdjustment && amount < 0) {
        adjustments.push({ item, amount });
      } else {
        addAmount(totals, item.category, amount);
        if (item.category && !item.category.isAdjustment && amount > 0) {
          const current = normalCategories.get(item.category.id) ?? { category: item.category, amount: 0 };
          current.amount += amount;
          normalCategories.set(item.category.id, current);
        }
      }
    }

    const eligible = [...normalCategories.values()].sort(
      (left, right) => right.amount - left.amount || left.category.id - right.category.id
    );
    const eligibleTotal = eligible.reduce((sum, entry) => sum + entry.amount, 0);

    for (const adjustment of adjustments) {
      if (eligibleTotal <= 0) {
        addAmount(totals, adjustment.item.category, adjustment.amount);
        continue;
      }

      let allocated = 0;
      for (const entry of eligible) {
        const amount = Math.trunc((adjustment.amount * entry.amount) / eligibleTotal);
        allocated += amount;
        addAmount(totals, entry.category, amount);
      }
      // trunc により残った ±1円等を、最大額Categoryへ決定的に寄せる。
      addAmount(totals, eligible[0].category, adjustment.amount - allocated);
    }
  }

  return [...totals.values()]
    .map(({ categoryId, categoryName, color, totalAmount }) => ({ categoryId, categoryName, color, totalAmount }))
    .filter((row) => row.totalAmount !== 0)
    .sort((left, right) => right.totalAmount - left.totalAmount || (left.categoryId ?? Number.MAX_SAFE_INTEGER) - (right.categoryId ?? Number.MAX_SAFE_INTEGER));
}
