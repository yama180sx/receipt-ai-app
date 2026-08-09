import {
  ClassificationConfidence,
  ClassificationCorrectionScope,
  ClassificationSource,
  ProductTypeStatus,
} from '@prisma/client';
import { AppError } from '../../utils/appError';
import { getCleanText } from '../../utils/normalizer';
import { runInTransaction, type PrismaTx } from '../../utils/prismaTransaction';
import {
  createClassificationCorrectionInTx,
  deleteProductClassificationCandidatesInTx,
  findActiveProductTypeWithCategoryInTx,
  findCategoryForProductTypeInTx,
  upsertHouseholdProductDictionaryInTx,
} from '../../repositories/productClassificationRepository';
import { findItemWithReceiptInTx, updateItemCategoryInTx } from '../../repositories/receiptRepository';

export type ProductClassificationCorrectionInput = {
  productTypeId: number;
  scope: ClassificationCorrectionScope;
};

async function correctItemProductClassificationInTx(
  tx: PrismaTx,
  itemId: number,
  familyGroupId: number,
  actorMemberId: number,
  input: ProductClassificationCorrectionInput
) {
  const item = await findItemWithReceiptInTx(tx, itemId);
  if (!item || item.receipt.familyGroupId !== familyGroupId) {
    throw new AppError('ItemNotFound', 404);
  }

  const productType = await findActiveProductTypeWithCategoryInTx(tx, input.productTypeId);
  if (!productType) throw new AppError('ProductTypeNotFound', 404);

  const rootCategoryName = productType.standardCategory.parent?.name ?? productType.standardCategory.name;
  const category = await findCategoryForProductTypeInTx(tx, familyGroupId, rootCategoryName);
  if (!category) throw new AppError('CategoryNotFound', 404);

  const updatedItem = await updateItemCategoryInTx(tx, itemId, {
    categoryId: category.id,
    standardCategoryId: productType.standardCategoryId,
    productTypeId: productType.id,
    productTypeStatus: ProductTypeStatus.CLASSIFIED,
    classificationSource: ClassificationSource.MANUAL,
    classificationConfidence: ClassificationConfidence.HIGH,
  });

  await createClassificationCorrectionInTx(tx, {
    familyGroupId,
    itemId,
    actorMemberId,
    previousProductTypeId: item.productTypeId,
    nextProductTypeId: productType.id,
    scope: input.scope,
  });
  await deleteProductClassificationCandidatesInTx(tx, itemId);

  if (input.scope === ClassificationCorrectionScope.SAME_OCR_NAME) {
    const normalizedName = getCleanText(item.name);
    if (!normalizedName) throw new AppError('ItemNameRequired', 400);
    await upsertHouseholdProductDictionaryInTx(tx, {
      familyGroupId,
      normalizedName,
      productTypeId: productType.id,
    });
  }

  return updatedItem;
}

export async function correctItemProductClassification(
  itemId: number,
  familyGroupId: number,
  actorMemberId: number,
  input: ProductClassificationCorrectionInput
) {
  return runInTransaction((tx) =>
    correctItemProductClassificationInTx(tx, itemId, familyGroupId, actorMemberId, input)
  );
}
