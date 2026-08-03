import logger from '../../utils/logger';
import { getReceiptAnalysisProvider } from '../../ai';
import { estimateCategoryId } from '../categoryService';
import { validateReceiptItems } from '../validationService';
import type { TenantContext } from '../../utils/context';
import { runInTransaction } from '../../utils/prismaTransaction';
import { classifyItemWithSimilarityCandidates } from '../productClassification/productClassificationService';

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

  // 確認画面でも、保存時と同じ優先順位（世帯内学習 → 標準ルール）で分類結果を表示する。
  // ここでは候補を永続化せず、確定保存時に改めて同じ分類を実行する。
  parsedData.items = await runInTransaction((tx) =>
    Promise.all(itemsWithCategories.map(async (item) => {
      const { classification } = await classifyItemWithSimilarityCandidates(tx, {
        familyGroupId,
        itemName: item.name,
        price: item.price,
        categoryId: item.categoryId,
      });
      const productType = classification.productTypeId
        ? await tx.productType.findUnique({
            where: { id: classification.productTypeId },
            select: { name: true },
          })
        : null;
      return { ...item, ...classification, productTypeName: productType?.name ?? null };
    }))
  );
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
