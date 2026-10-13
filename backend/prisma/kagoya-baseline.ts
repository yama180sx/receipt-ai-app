import { PrismaClient } from '@prisma/client';
import { syncStandardProductClassificationMasters } from './syncStandardProductClassificationMasters';
import { syncHouseholdBaseline } from './syncHouseholdBaseline';

const prisma = new PrismaClient();

async function main() {
  // This command is intentionally additive. It neither deletes nor updates household records.
  await syncStandardProductClassificationMasters(prisma);
  const result = await syncHouseholdBaseline(prisma);
  console.log(`baseline synchronized: familyGroups=${result.familyGroups} categoriesCreated=${result.categoriesCreated} storesCreated=${result.storesCreated} promptsCreated=${result.promptsCreated}`);
}

main()
  .catch(() => {
    console.error('Baseline synchronization failed.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
