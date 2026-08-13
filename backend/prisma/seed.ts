import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { loadInitialData } from './initialData';
import { syncStandardProductClassificationMasters } from './syncStandardProductClassificationMasters';
import { syncAllSeedTableSequences } from './syncSequences';

const prisma = new PrismaClient();

async function seedHouseholdSettings(familyGroupId: number, inviteCode: string) {
  const { households } = loadInitialData();
  const setting = households.households.find((item) => item.inviteCode === inviteCode);
  if (!setting) throw new Error(`Household settings are missing: ${inviteCode}`);
  for (const category of setting.categories) await prisma.category.create({ data: { ...category, familyGroupId } });
  for (const store of setting.stores) await prisma.store.create({ data: { ...store, familyGroupId } });
  for (const promptTemplate of households.promptTemplates) await prisma.promptTemplate.create({ data: { ...promptTemplate, domainHints: promptTemplate.domainHints ?? Prisma.JsonNull, familyGroupId } });
}

async function main() {
  const password_hash = await bcrypt.hash(process.env.SEED_MEMBER_PASSWORD ?? 'dev-password', 10);
  await prisma.productClassificationCandidate.deleteMany();
  await prisma.productClassificationAiRun.deleteMany();
  await prisma.productClassificationReclassificationItemAudit.deleteMany();
  await prisma.productClassificationReclassificationRun.deleteMany();
  await prisma.productClassificationLearningDataAudit.deleteMany();
  await prisma.classificationCorrection.deleteMany();
  await prisma.productClassificationHistory.deleteMany();
  await prisma.householdProductDictionary.deleteMany();
  await prisma.apiUsageLog.deleteMany();
  await prisma.itemSplit.deleteMany();
  await prisma.item.deleteMany();
  await prisma.settlementTransfer.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.standardProductClassificationRuleAudit.deleteMany();
  await prisma.standardProductClassificationRule.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.standardCategory.deleteMany();
  await prisma.promptTemplate.deleteMany();
  await prisma.store.deleteMany();
  await prisma.category.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.familyGroup.deleteMany();
  await syncStandardProductClassificationMasters(prisma);

  const yamamoto = await prisma.familyGroup.create({ data: { id: 1, name: '山本家', inviteCode: 'YAMAMOTO-2026' } });
  const sato = await prisma.familyGroup.create({ data: { id: 2, name: '佐藤家', inviteCode: 'SATO-2026' } });
  for (const member of [{ id: 1, name: 'あなた（管理者）', familyGroupId: yamamoto.id, role: 'ADMIN' as const }, { id: 2, name: '妻', familyGroupId: yamamoto.id, role: 'USER' as const }, { id: 3, name: '息子（高校生）', familyGroupId: yamamoto.id, role: 'USER' as const }, { id: 4, name: '佐藤（管理者）', familyGroupId: sato.id, role: 'ADMIN' as const }, { id: 5, name: '佐藤（配偶者）', familyGroupId: sato.id, role: 'USER' as const }]) await prisma.familyMember.create({ data: { ...member, password_hash } });
  await seedHouseholdSettings(yamamoto.id, yamamoto.inviteCode);
  await seedHouseholdSettings(sato.id, sato.inviteCode);
  const yamamotoFood = await prisma.category.findFirstOrThrow({ where: { familyGroupId: yamamoto.id, name: '食費' } });
  const satoFood = await prisma.category.findFirstOrThrow({ where: { familyGroupId: sato.id, name: '食費' } });
  await prisma.receipt.create({ data: { familyGroupId: yamamoto.id, memberId: 1, storeName: '山本家テスト店', date: new Date('2026-01-10T12:00:00.000Z'), totalAmount: 100, items: { create: { name: 'テスト商品', price: 100, quantity: 1, categoryId: yamamotoFood.id } } } });
  await prisma.receipt.create({ data: { familyGroupId: sato.id, memberId: 4, storeName: '佐藤家テスト店', date: new Date('2026-01-15T12:00:00.000Z'), totalAmount: 500, imagePath: 'uploads/tenant-isolation-fixture.webp', items: { create: { name: '他世帯テスト商品', price: 500, quantity: 1, categoryId: satoFood.id } } } });
  await syncAllSeedTableSequences(prisma);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
