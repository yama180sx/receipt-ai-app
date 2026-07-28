import logger from '../../utils/logger';
import { getReceiptAnalysisProvider } from '../../ai';
import { estimateCategoryId } from '../categoryService';
import { validateReceiptItems } from '../validationService';
import type { TenantContext } from '../../utils/context';

/**
 * [Issue #49-8 / #72 / #63] 解析のみを実行し、推論カテゴリを付与して返す
 * 戻り値に usageLogId を含める。DB 永続化は行わない（commit 時に実施）。
 */
export async function analyzeOnly(ctx: TenantContext, imagePath: string) {
  const { memberId, familyGroupId } = ctx;
  logger.info(`[Analyze] 解析開始: ${imagePath} (Member: ${memberId}, 世帯: ${familyGroupId})`);

  const parsedData = await getReceiptAnalysisProvider().analyzeReceiptImage(imagePath, memberId);
  const itemsWithCategories = await Promise.all(
    parsedData.items.map(async (item) => {
      let initialCategoryId = null;

      if (familyGroupId) {
        initialCategoryId = await estimateCategoryId(item.name, parsedData.storeName || '', familyGroupId);
      }

      return {
        ...item,
        price: parseFloat(String(item.price || 0)),
        quantity: parseFloat(String(item.quantity || 1)),
        categoryId: initialCategoryId,
      };
    })
  );

  parsedData.items = itemsWithCategories;
  parsedData.taxAmount = parsedData.taxAmount
    ? parseFloat(String(parsedData.taxAmount))
    : undefined;

  const validation = validateReceiptItems(parsedData.items);

  return {
    parsedData,
    imagePath,
    validation,
  };
}
