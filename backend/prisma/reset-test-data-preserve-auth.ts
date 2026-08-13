import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { receiptQueue } from '../src/queues/receiptQueue';
import { loadInitialData } from './initialData';

const prisma = new PrismaClient();
const CONFIRMATION = 'RESET_TEST_DATA';
const LOCK_KEY = 1175_2026;

function assertExecutionInputs() {
  if (process.env.RESET_TEST_DATA_CONFIRM !== CONFIRMATION) throw new Error('RESET_TEST_DATA_CONFIRM is required.');
  if (!process.env.RESET_TEST_DATA_ENV || process.env.RESET_TEST_DATA_ENV !== process.env.ENV_NAME) throw new Error('RESET_TEST_DATA_ENV must match ENV_NAME.');
  if (!process.env.RESET_TEST_DATA_BACKUP_REFERENCE) throw new Error('RESET_TEST_DATA_BACKUP_REFERENCE is required.');
}

async function assertHouseholdsMatch() {
  const { households } = loadInitialData();
  const expected = households.households.map((item) => item.inviteCode).sort();
  const actual = (await prisma.familyGroup.findMany({ select: { inviteCode: true } })).map((item) => item.inviteCode).sort();
  if (expected.join('\n') !== actual.join('\n')) throw new Error('FamilyGroup invite-code set does not match the fixed snapshot.');
}

async function snapshotHash() {
  const files = ['standard_product_classification.json', 'household_settings.json', 'test-data-reset-manifest.json'];
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(await fs.readFile(path.join(__dirname, 'seeds', file)));
  return hash.digest('hex');
}

async function dryRun() {
  const { standard, households, manifest } = loadInitialData();
  await assertHouseholdsMatch();
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const uploadFiles = await fs.readdir(uploadsDir).catch(() => [] as string[]);
  const counts = await Promise.all([prisma.receipt.count(), prisma.item.count(), prisma.category.count(), prisma.store.count(), prisma.promptTemplate.count(), prisma.standardProductClassificationRule.count()]);
  console.log(JSON.stringify({
    mode: 'dry-run', environment: process.env.ENV_NAME, backupReference: process.env.RESET_TEST_DATA_BACKUP_REFERENCE,
    snapshotSha256: await snapshotHash(), snapshotCounts: manifest.expectedCounts, householdCount: households.households.length,
    currentCounts: { receipts: counts[0], items: counts[1], categories: counts[2], stores: counts[3], promptTemplates: counts[4], standardRules: counts[5] },
    reinsertCounts: {
      categories: households.households.reduce((sum, item) => sum + item.categories.length, 0),
      stores: households.households.reduce((sum, item) => sum + item.stores.length, 0),
      promptTemplates: households.households.length * households.promptTemplates.length,
      standardCategories: standard.standardCategories.length,
      productTypes: standard.productTypes.length,
      standardRules: standard.standardProductClassificationRules.length,
    },
    removableUploadFiles: uploadFiles.filter((file) => !manifest.preservedUploadPaths.includes(`uploads/${file}`)).length,
  }));
}

async function resetDatabase() {
  const { standard, households } = loadInitialData();
  const familyGroups = await prisma.familyGroup.findMany({ select: { id: true, inviteCode: true } });
  await prisma.$transaction(async (tx) => {
    await tx.productClassificationCandidate.deleteMany(); await tx.productClassificationAiRun.deleteMany(); await tx.productClassificationReclassificationItemAudit.deleteMany(); await tx.productClassificationReclassificationRun.deleteMany(); await tx.productClassificationLearningDataAudit.deleteMany(); await tx.classificationCorrection.deleteMany(); await tx.productClassificationHistory.deleteMany(); await tx.householdProductDictionary.deleteMany(); await tx.apiUsageLog.deleteMany(); await tx.itemSplit.deleteMany(); await tx.item.deleteMany(); await tx.settlementTransfer.deleteMany(); await tx.receipt.deleteMany();
    await tx.standardProductClassificationRuleAudit.deleteMany(); await tx.standardProductClassificationRule.deleteMany(); await tx.productType.deleteMany(); await tx.standardCategory.deleteMany(); await tx.promptTemplate.deleteMany(); await tx.store.deleteMany(); await tx.category.deleteMany();
    const categoryIds = new Map<string, number>();
    for (const category of standard.standardCategories) { const parentId = category.parentCode ? categoryIds.get(category.parentCode) : null; if (category.parentCode && !parentId) throw new Error(`Missing parent: ${category.parentCode}`); const record = await tx.standardCategory.create({ data: { code: category.code, name: category.name, parentId, displayOrder: category.displayOrder, isActive: true } }); categoryIds.set(category.code, record.id); }
    const productTypeIds = new Map<string, number>();
    for (const productType of standard.productTypes) { const standardCategoryId = categoryIds.get(productType.standardCategoryCode); if (!standardCategoryId) throw new Error(`Missing category: ${productType.standardCategoryCode}`); const record = await tx.productType.create({ data: { code: productType.code, name: productType.name, standardCategoryId, displayOrder: productType.displayOrder, isActive: true } }); productTypeIds.set(productType.code, record.id); }
    for (const rule of standard.standardProductClassificationRules) { const standardCategoryId = categoryIds.get(rule.standardCategoryCode); const productTypeId = productTypeIds.get(rule.productTypeCode); if (!standardCategoryId || !productTypeId) throw new Error(`Missing rule reference: ${rule.normalizedKeyword}`); await tx.standardProductClassificationRule.create({ data: { normalizedKeyword: rule.normalizedKeyword, standardCategoryId, productTypeId, priority: rule.priority, isActive: true, lastChangeReason: rule.reason } }); }
    for (const familyGroup of familyGroups) { const setting = households.households.find((item) => item.inviteCode === familyGroup.inviteCode); if (!setting) throw new Error('Unexpected family group after validation.'); for (const category of setting.categories) await tx.category.create({ data: { ...category, familyGroupId: familyGroup.id } }); for (const store of setting.stores) await tx.store.create({ data: { ...store, familyGroupId: familyGroup.id } }); for (const promptTemplate of households.promptTemplates) await tx.promptTemplate.create({ data: { ...promptTemplate, domainHints: promptTemplate.domainHints ?? Prisma.JsonNull, familyGroupId: familyGroup.id } }); }
  });
}

async function removeOperationalUploads() {
  const { manifest } = loadInitialData(); const uploadsDir = path.join(process.cwd(), 'uploads');
  for (const file of await fs.readdir(uploadsDir).catch(() => [] as string[])) if (!manifest.preservedUploadPaths.includes(`uploads/${file}`)) await fs.unlink(path.join(uploadsDir, file));
}

async function main() {
  assertExecutionInputs();
  const lock = await prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`;
  if (!lock[0]?.locked) throw new Error('Another reset is already running.');
  try { await dryRun(); if (process.argv.includes('--dry-run')) return; await resetDatabase(); await receiptQueue.obliterate({ force: true }); await removeOperationalUploads(); console.log(JSON.stringify({ mode: 'executed', environment: process.env.ENV_NAME, backupReference: process.env.RESET_TEST_DATA_BACKUP_REFERENCE, snapshotSha256: await snapshotHash() })); }
  finally { await prisma.$executeRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`; await receiptQueue.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
