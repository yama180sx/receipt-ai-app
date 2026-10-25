import { Prisma, PrismaClient } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadSecretFiles } from '../src/config/secretFiles';

// T320 stable -> KAGOYA: authentication and household settings only.
// Receipt-derived data, uploads, queues, TOTP secrets, and operational AI data
// are deliberately absent from this portable document.
const FORMAT_VERSION = 1;
const CONFIRM_EXPORT = 'EXPORT_STABLE_AUTH_SETTINGS';
const CONFIRM_IMPORT = 'IMPORT_KAGOYA_AUTH_SETTINGS';

type Document = {
  formatVersion: number;
  families: Array<{ sourceId: number; name: string; inviteCode: string; createdAt: string }>;
  members: Array<{ sourceId: number; sourceFamilyGroupId: number; name: string; passwordHash: string | null; authVersion: number; role: 'ADMIN' | 'USER' }>;
  categories: Array<{ sourceFamilyGroupId: number; name: string; color: string | null; keywords: Prisma.JsonValue; isAdjustment: boolean }>;
  stores: Array<{ sourceFamilyGroupId: number; officialName: string; aliases: Prisma.JsonValue }>;
  prompts: Array<{ sourceFamilyGroupId: number; key: string; name: string; description: string | null; systemPrompt: string; domainHints: Prisma.JsonValue | null; isActive: boolean; version: number; createdAt: string; updatedAt: string }>;
  transfers: Array<{ sourceFamilyGroupId: number; sourceFromMemberId: number; sourceToMemberId: number; month: string; amount: number; settledAt: string }>;
};

function fail(message: string): never { throw new Error(message); }

function outputPath(): string {
  const value = process.env.KAGOYA_SELECTIVE_MIGRATION_FILE;
  if (!value || !path.isAbsolute(value)) fail('KAGOYA_SELECTIVE_MIGRATION_FILE must be an absolute path.');
  return value;
}

function countSummary(document: Document) {
  return { families: document.families.length, members: document.members.length, categories: document.categories.length, stores: document.stores.length, prompts: document.prompts.length, transfers: document.transfers.length };
}

function parseDocument(input: unknown): Document {
  if (!input || typeof input !== 'object') fail('Migration document is invalid.');
  const document = input as Partial<Document>;
  if (document.formatVersion !== FORMAT_VERSION || !Array.isArray(document.families) || !Array.isArray(document.members) || !Array.isArray(document.categories) || !Array.isArray(document.stores) || !Array.isArray(document.prompts) || !Array.isArray(document.transfers)) fail('Migration document format is invalid.');
  if ((input as { members?: Array<{ totpSecret?: unknown }> }).members?.some((member) => member.totpSecret !== undefined)) fail('Migration document must not contain TOTP secrets.');
  return document as Document;
}

async function exportDocument(prisma: PrismaClient) {
  if (process.env.KAGOYA_SELECTIVE_MIGRATION_CONFIRM !== CONFIRM_EXPORT) fail(`${CONFIRM_EXPORT} confirmation is required.`);
  const destination = outputPath();
  const [families, members, categories, stores, prompts, transfers] = await Promise.all([
    prisma.familyGroup.findMany({ select: { id: true, name: true, inviteCode: true, createdAt: true }, orderBy: { id: 'asc' } }),
    prisma.familyMember.findMany({ select: { id: true, familyGroupId: true, name: true, password_hash: true, authVersion: true, role: true }, orderBy: { id: 'asc' } }),
    prisma.category.findMany({ select: { familyGroupId: true, name: true, color: true, keywords: true, isAdjustment: true } }),
    prisma.store.findMany({ select: { familyGroupId: true, officialName: true, aliases: true } }),
    prisma.promptTemplate.findMany({ select: { familyGroupId: true, key: true, name: true, description: true, systemPrompt: true, domainHints: true, isActive: true, version: true, createdAt: true, updatedAt: true } }),
    prisma.settlementTransfer.findMany({ select: { familyGroupId: true, fromMemberId: true, toMemberId: true, month: true, amount: true, settledAt: true } }),
  ]);
  const document: Document = {
    formatVersion: FORMAT_VERSION,
    families: families.map((item) => ({ sourceId: item.id, name: item.name, inviteCode: item.inviteCode, createdAt: item.createdAt.toISOString() })),
    members: members.map((item) => ({ sourceId: item.id, sourceFamilyGroupId: item.familyGroupId, name: item.name, passwordHash: item.password_hash, authVersion: item.authVersion, role: item.role })),
    categories: categories.map((item) => ({ sourceFamilyGroupId: item.familyGroupId, name: item.name, color: item.color, keywords: item.keywords, isAdjustment: item.isAdjustment })),
    stores: stores.map((item) => ({ sourceFamilyGroupId: item.familyGroupId, officialName: item.officialName, aliases: item.aliases })),
    prompts: prompts.map((item) => ({ sourceFamilyGroupId: item.familyGroupId, key: item.key, name: item.name, description: item.description, systemPrompt: item.systemPrompt, domainHints: item.domainHints, isActive: item.isActive, version: item.version, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
    transfers: transfers.map((item) => ({ sourceFamilyGroupId: item.familyGroupId, sourceFromMemberId: item.fromMemberId, sourceToMemberId: item.toMemberId, month: item.month, amount: item.amount, settledAt: item.settledAt.toISOString() })),
  };
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, JSON.stringify(document), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  console.log(`selective migration export completed: ${JSON.stringify(countSummary(document))}`);
}

async function importDocument(prisma: PrismaClient, dryRun: boolean) {
  if (process.env.KAGOYA_SELECTIVE_MIGRATION_CONFIRM !== CONFIRM_IMPORT) fail(`${CONFIRM_IMPORT} confirmation is required.`);
  const document = parseDocument(JSON.parse(await readFile(outputPath(), 'utf8')));
  const existing = await prisma.$transaction(async (tx) => ({
    familyGroups: await tx.familyGroup.count(), members: await tx.familyMember.count(), categories: await tx.category.count(), stores: await tx.store.count(), prompts: await tx.promptTemplate.count(), transfers: await tx.settlementTransfer.count(),
    receipts: await tx.receipt.count(), items: await tx.item.count(), jobs: await tx.receiptAnalysisJob.count(),
  }));
  if (Object.values(existing).some((count) => count !== 0)) fail('KAGOYA target must be empty before selective migration.');
  if (dryRun) { console.log(`selective migration dry-run passed: ${JSON.stringify(countSummary(document))}`); return; }
  await prisma.$transaction(async (tx) => {
    const familyIds = new Map<number, number>(); const memberIds = new Map<number, number>();
    for (const family of document.families) familyIds.set(family.sourceId, (await tx.familyGroup.create({ data: { name: family.name, inviteCode: family.inviteCode, createdAt: new Date(family.createdAt) } })).id);
    for (const member of document.members) {
      const familyGroupId = familyIds.get(member.sourceFamilyGroupId); if (!familyGroupId) fail('Member has an unknown family group.');
      const created = await tx.familyMember.create({ data: { name: member.name, password_hash: member.passwordHash, authVersion: member.authVersion, role: member.role, familyGroupId, totpSecret: null, totpKeyVersion: null, totpEnabled: false, totpVerifiedAt: null } });
      memberIds.set(member.sourceId, created.id);
    }
    for (const category of document.categories) { const familyGroupId = familyIds.get(category.sourceFamilyGroupId); if (!familyGroupId) fail('Category has an unknown family group.'); await tx.category.create({ data: { familyGroupId, name: category.name, color: category.color, keywords: category.keywords as Prisma.InputJsonValue, isAdjustment: category.isAdjustment } }); }
    for (const store of document.stores) { const familyGroupId = familyIds.get(store.sourceFamilyGroupId); if (!familyGroupId) fail('Store has an unknown family group.'); await tx.store.create({ data: { familyGroupId, officialName: store.officialName, aliases: store.aliases as Prisma.InputJsonValue } }); }
    for (const prompt of document.prompts) { const familyGroupId = familyIds.get(prompt.sourceFamilyGroupId); if (!familyGroupId) fail('Prompt has an unknown family group.'); await tx.promptTemplate.create({ data: { familyGroupId, key: prompt.key, name: prompt.name, description: prompt.description, systemPrompt: prompt.systemPrompt, domainHints: prompt.domainHints === null ? Prisma.JsonNull : prompt.domainHints as Prisma.InputJsonValue, isActive: prompt.isActive, version: prompt.version, createdAt: new Date(prompt.createdAt), updatedAt: new Date(prompt.updatedAt) } }); }
    for (const transfer of document.transfers) { const familyGroupId = familyIds.get(transfer.sourceFamilyGroupId); const fromMemberId = memberIds.get(transfer.sourceFromMemberId); const toMemberId = memberIds.get(transfer.sourceToMemberId); if (!familyGroupId || !fromMemberId || !toMemberId) fail('Transfer has an unknown reference.'); await tx.settlementTransfer.create({ data: { familyGroupId, fromMemberId, toMemberId, month: transfer.month, amount: transfer.amount, settledAt: new Date(transfer.settledAt) } }); }
  }, { timeout: 60_000 });
  console.log(`selective migration import completed: ${JSON.stringify(countSummary(document))} totpEnabled=0`);
}

async function main() {
  loadSecretFiles(); const prisma = new PrismaClient();
  try { if (process.argv[2] === 'export') await exportDocument(prisma); else if (process.argv[2] === 'import') await importDocument(prisma, process.argv.includes('--dry-run')); else fail('usage: kagoya-selective-migration.ts {export|import [--dry-run]}'); }
  finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Selective migration failed.'); process.exitCode = 1; });
