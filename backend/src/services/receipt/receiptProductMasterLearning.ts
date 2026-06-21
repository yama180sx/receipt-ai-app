import type { PrismaTx } from '../../utils/prismaTransaction';
import { getCleanText } from '../../utils/normalizer';

/** ProductMaster 学習（カテゴリ紐付け）— tx 明示渡し */
export async function upsertProductMasterCategory(
  tx: PrismaTx,
  params: {
    itemName: string;
    storeName: string;
    familyGroupId: number;
    categoryId: number;
  }
): Promise<void> {
  const cleanName = getCleanText(params.itemName);
  const cleanStore = getCleanText(params.storeName);

  await tx.productMaster.upsert({
    where: {
      name_storeName_familyGroupId: {
        name: cleanName,
        storeName: cleanStore,
        familyGroupId: params.familyGroupId,
      },
    },
    update: { categoryId: params.categoryId },
    create: {
      name: cleanName,
      storeName: cleanStore,
      categoryId: params.categoryId,
      familyGroupId: params.familyGroupId,
    },
  });
}
