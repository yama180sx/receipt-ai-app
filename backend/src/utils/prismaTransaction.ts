import { prisma } from './prismaClient';

/** Prisma インタラクティブトランザクションのクライアント型 */
type PrismaTransactionCallback = Extract<
  Parameters<typeof prisma.$transaction>[0],
  (tx: never) => Promise<unknown>
>;
export type PrismaTx = Parameters<PrismaTransactionCallback>[0];

type TransactionOptions = {
  timeout?: number;
};

/** 汎用トランザクション実行（更新・按分等） */
export async function runInTransaction<T>(
  fn: (tx: PrismaTx) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  if (options?.timeout) {
    return prisma.$transaction((tx) => fn(tx), { timeout: options.timeout });
  }
  return prisma.$transaction((tx) => fn(tx));
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
