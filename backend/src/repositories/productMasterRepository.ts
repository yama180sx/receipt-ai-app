import { prisma } from '../utils/prismaClient';
import { runInTransaction, type PrismaTx } from '../utils/prismaTransaction';
import { updateReceiptStoreNamesInTx } from './receiptRepository';

export type ListProductMastersWhere = {
  familyGroupId: number;
  name?: { contains: string; mode: 'insensitive' };
  storeName?: { contains: string; mode: 'insensitive' };
};

export async function findProductMasters(where: ListProductMastersWhere) {
  return prisma.productMaster.findMany({
    where,
    include: { category: true },
    orderBy: { id: 'desc' },
    take: 100,
  });
}

export async function findProductMasterByIdAndFamilyGroup(id: number, familyGroupId: number) {
  return prisma.productMaster.findFirst({
    where: { id, familyGroupId },
  });
}

export async function updateProductMasterRecord(
  id: number,
  data: { name: string; storeName: string; categoryId: number }
) {
  return prisma.productMaster.update({
    where: { id },
    data: {
      name: data.name,
      storeName: data.storeName,
      categoryId: data.categoryId,
    },
  });
}

export async function deleteProductMasterById(id: number) {
  return prisma.productMaster.delete({ where: { id } });
}

async function updateProductMasterStoreNamesInTx(
  tx: PrismaTx,
  familyGroupId: number,
  sourceStoreName: string,
  targetStoreName: string
) {
  return tx.productMaster.updateMany({
    where: { storeName: sourceStoreName, familyGroupId },
    data: { storeName: targetStoreName },
  });
}

export async function mergeStoreNamesInTransaction(
  familyGroupId: number,
  sourceStoreName: string,
  targetStoreName: string
) {
  return runInTransaction(async (tx) => {
    const updateResult = await updateProductMasterStoreNamesInTx(
      tx,
      familyGroupId,
      sourceStoreName,
      targetStoreName
    );
    await updateReceiptStoreNamesInTx(tx, familyGroupId, sourceStoreName, targetStoreName);
    return updateResult;
  });
}
