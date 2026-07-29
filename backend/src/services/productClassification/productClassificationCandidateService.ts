import { findProductClassificationCandidatesForItem } from '../../repositories/productClassificationRepository';
import { AppError } from '../../utils/appError';

/** 保存済みの類似候補を世帯境界付きで取得する。 */
export async function listProductClassificationCandidates(
  itemId: number,
  familyGroupId: number
) {
  const item = await findProductClassificationCandidatesForItem(itemId, familyGroupId);
  if (!item) throw new AppError('ItemNotFound', 404);
  return item.productClassificationCandidates;
}
