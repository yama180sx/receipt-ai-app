import { PrismaClient } from '@prisma/client';

/** seed / upsert で明示 id を入れたあと、PostgreSQL の serial を MAX(id) に合わせる */
const TABLES_WITH_EXPLICIT_SEED_IDS = [
  'FamilyGroup',
  'FamilyMember',
  'Category',
] as const;

type SeedTable = (typeof TABLES_WITH_EXPLICIT_SEED_IDS)[number];

/**
 * 指定テーブルの id シーケンスを MAX(id) に同期する。
 * 未同期のまま create() すると Unique constraint failed on (id) になる。
 */
export async function syncPostgresIdSequence(
  prisma: PrismaClient,
  tableName: SeedTable
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX("id") FROM "${tableName}"), 1),
      true
    )
  `);
}

export async function syncAllSeedTableSequences(prisma: PrismaClient): Promise<void> {
  for (const table of TABLES_WITH_EXPLICIT_SEED_IDS) {
    await syncPostgresIdSequence(prisma, table);
  }
  console.log(`✅ PostgreSQL id sequences synced: ${TABLES_WITH_EXPLICIT_SEED_IDS.join(', ')}`);
}
