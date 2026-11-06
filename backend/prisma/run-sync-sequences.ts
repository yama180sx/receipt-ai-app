import { createPrismaClient } from '../src/utils/prismaFactory';
import { syncAllSeedTableSequences } from './syncSequences';

const prisma = createPrismaClient();

syncAllSeedTableSequences(prisma)
  .catch((e) => {
    console.error('❌ Sequence sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
