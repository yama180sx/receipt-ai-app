import { PrismaClient } from '@prisma/client';
import { syncAllSeedTableSequences } from './syncSequences';

const prisma = new PrismaClient();

syncAllSeedTableSequences(prisma)
  .catch((e) => {
    console.error('❌ Sequence sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
