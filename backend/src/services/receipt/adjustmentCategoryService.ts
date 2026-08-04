import type { PrismaTx } from '../../utils/prismaTransaction';
import { findOrCreateAdjustmentCategoryInTx } from '../../repositories/categoryRepository';
import { isNonProductAdjustmentLine } from '../../utils/nonProductAdjustment';

/** Issue #114-9: 承認済みの調整明細を世帯ごとの専用Categoryへ正規化する。 */
export async function resolveAdjustmentCategoryIdInTx(
  tx: PrismaTx,
  input: { familyGroupId: number; itemName: string; price: number; categoryId: number | null }
): Promise<number | null> {
  if (!isNonProductAdjustmentLine(input)) return input.categoryId;
  const adjustmentCategory = await findOrCreateAdjustmentCategoryInTx(tx, input.familyGroupId);
  return adjustmentCategory.id;
}
