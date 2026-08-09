import {
  findCategoryIdsByKeyword,
  findFallbackCategoryId,
} from '../../repositories/categoryRepository';
import logger from '../../utils/logger';

/**
 * OCR 明細の初期カテゴリを世帯内のキーワードから推定する。
 * DB アクセスは Repository に委譲し、候補がない場合は「その他」を使う。
 */
export async function estimateCategoryId(itemName: string, familyGroupId: number): Promise<number> {
  try {
    const categoryByKeyword = await findCategoryIdsByKeyword(familyGroupId, itemName);
    if (categoryByKeyword.length > 0) {
      return categoryByKeyword[0].id;
    }

    const fallback = await findFallbackCategoryId(familyGroupId);
    return fallback?.id ?? 0;
  } catch (error) {
    logger.error(`[CATEGORY_ESTIMATION_ERROR] ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}
