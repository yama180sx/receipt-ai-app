import type { ClassificationCorrectionScope } from '@prisma/client';
import { prisma } from '../utils/prismaClient';
import type { PrismaTx } from '../utils/prismaTransaction';

export async function findActiveProductTypeWithCategoryInTx(tx: PrismaTx, productTypeId: number) {
  return tx.productType.findFirst({
    where: {
      id: productTypeId,
      isActive: true,
      standardCategory: { isActive: true },
    },
    include: { standardCategory: { include: { parent: true } } },
  });
}

export async function findActiveProductTypes() {
  return prisma.productType.findMany({
    where: { isActive: true, standardCategory: { isActive: true } },
    orderBy: [{ standardCategory: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
  });
}

export async function findCategoryForProductTypeInTx(
  tx: PrismaTx,
  familyGroupId: number,
  rootCategoryName: string
) {
  return tx.category.findFirst({
    where: { familyGroupId, name: rootCategoryName },
    select: { id: true },
  });
}

export async function createClassificationCorrectionInTx(
  tx: PrismaTx,
  input: {
    familyGroupId: number;
    itemId: number;
    actorMemberId: number;
    previousProductTypeId: number | null;
    nextProductTypeId: number;
    scope: ClassificationCorrectionScope;
  }
) {
  return tx.classificationCorrection.create({ data: input });
}

export async function upsertHouseholdProductDictionaryInTx(
  tx: PrismaTx,
  input: { familyGroupId: number; normalizedName: string; productTypeId: number }
) {
  return tx.householdProductDictionary.upsert({
    where: {
      familyGroupId_normalizedName: {
        familyGroupId: input.familyGroupId,
        normalizedName: input.normalizedName,
      },
    },
    create: { ...input, isActive: true },
    update: { productTypeId: input.productTypeId, isActive: true },
  });
}

export async function upsertProductClassificationAliasInTx(
  tx: PrismaTx,
  input: { familyGroupId: number; normalizedName: string; productTypeId: number }
) {
  return tx.productClassificationAlias.upsert({
    where: {
      familyGroupId_normalizedName: {
        familyGroupId: input.familyGroupId,
        normalizedName: input.normalizedName,
      },
    },
    create: { ...input, isActive: true },
    update: { productTypeId: input.productTypeId, isActive: true },
  });
}
