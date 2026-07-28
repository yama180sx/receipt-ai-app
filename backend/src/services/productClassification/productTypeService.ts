import { findActiveProductTypes } from '../../repositories/productClassificationRepository';

/** 商品種別選択UI用の有効な共通マスタ一覧 */
export async function listActiveProductTypes() {
  return findActiveProductTypes();
}
