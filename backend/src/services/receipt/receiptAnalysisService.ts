import { prisma } from '../../utils/prismaClient';
import logger from '../../utils/logger';
import { getCleanText } from '../../utils/normalizer';
import { getReceiptAnalysisProvider } from '../../ai';
import { estimateCategoryId } from '../categoryService';
import { validateReceiptItems } from '../validationService';

/**
 * [Issue #49-8 / #72 / #63] 解析のみを実行し、推論カテゴリを付与して返す
 * 戻り値に usageLogId を含める。DB 永続化は行わない（commit 時に実施）。
 */
export async function analyzeOnly(memberId: number, imagePath: string) {
  logger.info(`[Analyze] 解析開始: ${imagePath} (Member: ${memberId})`);

  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true },
  });
  const familyGroupId = member?.familyGroupId;

  const parsedData = await getReceiptAnalysisProvider().analyzeReceiptImage(imagePath, memberId);
  const cleanStore = getCleanText(parsedData.storeName || '');

  const itemsWithCategories = await Promise.all(
    parsedData.items.map(async (item) => {
      const cleanName = getCleanText(item.name);
      let initialCategoryId = null;

      if (familyGroupId) {
        const mastered = await prisma.productMaster.findUnique({
          where: {
            name_storeName_familyGroupId: { name: cleanName, storeName: cleanStore, familyGroupId },
          },
        });
        initialCategoryId = mastered
          ? mastered.categoryId
          : await estimateCategoryId(cleanName, cleanStore, familyGroupId, prisma);
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
