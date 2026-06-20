import { prisma } from '../../utils/prismaClient';
import logger from '../../utils/logger';
import { AppError } from '../../utils/appError';
import type { TenantContext } from '../../utils/context';

export type ListProductMastersQuery = {
  q?: string;
  store?: string;
};

export async function listProductMasters(ctx: TenantContext, query: ListProductMastersQuery) {
  const { q, store } = query;
  const where: {
    familyGroupId: number;
    name?: { contains: string; mode: 'insensitive' };
    storeName?: { contains: string; mode: 'insensitive' };
  } = { familyGroupId: ctx.familyGroupId };

  if (q) where.name = { contains: String(q), mode: 'insensitive' };
  if (store) where.storeName = { contains: String(store), mode: 'insensitive' };

  return prisma.productMaster.findMany({
    where,
    include: { category: true },
    orderBy: { id: 'desc' },
    take: 100,
  });
}

export async function updateProductMaster(
  ctx: TenantContext,
  id: number,
  input: { name: string; storeName: string; categoryId: number }
) {
  const existing = await prisma.productMaster.findFirst({
    where: { id, familyGroupId: ctx.familyGroupId },
  });
  if (!existing) {
    throw new AppError('ProductMaster not found', 404);
  }

  return prisma.productMaster.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      storeName: input.storeName,
      categoryId: Number(input.categoryId),
    },
  });
}

export async function mergeStoreNames(
  ctx: TenantContext,
  sourceStoreName: string,
  targetStoreName: string
) {
  if (!sourceStoreName || !targetStoreName) {
    throw new AppError('統合元と統合先の指定が必要です', 400);
  }

  const { familyGroupId } = ctx;

  const result = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.productMaster.updateMany({
      where: { storeName: sourceStoreName, familyGroupId },
      data: { storeName: targetStoreName },
    });

    await tx.receipt.updateMany({
      where: { storeName: sourceStoreName, familyGroupId },
      data: { storeName: targetStoreName },
    });

    return updateResult;
  });

  logger.info(`[STORE_MERGE] Family:${familyGroupId} | ${sourceStoreName} -> ${targetStoreName}`);
  return { message: '統合が完了しました', count: result.count };
}

export async function deleteProductMaster(ctx: TenantContext, id: number) {
  const existing = await prisma.productMaster.findFirst({
    where: { id, familyGroupId: ctx.familyGroupId },
  });
  if (!existing) {
    throw new AppError('ProductMaster not found', 404);
  }

  await prisma.productMaster.delete({ where: { id: existing.id } });
}
