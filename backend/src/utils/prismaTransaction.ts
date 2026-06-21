import { Prisma } from '@prisma/client';
import { prisma } from './prismaClient';

/** Prisma インタラクティブトランザクションのクライアント型 */
export type PrismaTx = Prisma.TransactionClient;

type TransactionOptions = {
  timeout?: number;
};

/** 汎用トランザクション実行（更新・按分等） */
export async function runInTransaction<T>(
  fn: (tx: PrismaTx) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  if (options?.timeout) {
    return prisma.$transaction(fn, { timeout: options.timeout });
  }
  return prisma.$transaction(fn);
}

/**
 * レシート commit 系の唯一の tx 開始点（Issue #98-4）
 * saveParsedReceipt / saveConfirmedReceipt の DB 書込はここ経由のみ。
 */
export async function runReceiptCommitTransaction<T>(
  fn: (tx: PrismaTx) => Promise<T>
): Promise<T> {
  return runInTransaction(fn, { timeout: 15000 });
}
