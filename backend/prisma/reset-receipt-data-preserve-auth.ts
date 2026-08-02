import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { receiptQueue } from '../src/queues/receiptQueue';

const prisma = new PrismaClient();

/**
 * 開発用: レシート由来の業務データだけを初期化する。
 * FamilyGroup / FamilyMember（パスワード、ロール、TOTP、招待コード）は一切変更しない。
 */
async function main() {
  // 解析結果確認待ちを含むBullMQジョブはPostgreSQLではなくRedisに保持される。
  await receiptQueue.obliterate({ force: true });

  await prisma.$transaction(async (tx) => {
    await tx.productClassificationAiRun.deleteMany();
    await tx.apiUsageLog.deleteMany();
    await tx.productClassificationReclassificationRun.deleteMany();
    await tx.productClassificationLearningDataAudit.deleteMany();
    await tx.classificationCorrection.deleteMany();
    await tx.productClassificationHistory.deleteMany();
    await tx.householdProductDictionary.deleteMany();
    await tx.settlementTransfer.deleteMany();
    await tx.item.deleteMany();
    await tx.receipt.deleteMany();
  });

  const uploadsDirectory = path.resolve(process.cwd(), 'uploads');
  const files = await fs.readdir(uploadsDirectory).catch(() => [] as string[]);
  await Promise.all(files
    .filter((file) => file.startsWith('receipt-'))
    .map((file) => fs.unlink(path.join(uploadsDirectory, file)).catch(() => undefined)));
  await receiptQueue.close();

  console.log('Receipt-related data, pending analysis jobs, and uncommitted receipt images were reset. Family groups and members were preserved.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
