import { createPrismaClient } from '../src/utils/prismaFactory';
import { syncStandardProductClassificationMasters } from './syncStandardProductClassificationMasters';

const prisma = createPrismaClient();

/** 共通マスタ更新（運用環境 — 全データ削除なし） */
async function main() {
  console.log('--- 🔄 Master Data Update Start ---');

  await syncStandardProductClassificationMasters(prisma);
  console.log('🗂️ Standard product classification masters synchronized.');

  console.log('--- 🚀 Master Data Update Completed ---');
}

main()
  .catch((e) => {
    console.error('❌ Update Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
