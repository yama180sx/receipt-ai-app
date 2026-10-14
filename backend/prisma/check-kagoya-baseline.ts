import { PrismaClient } from '@prisma/client';
import { loadInitialData } from './initialData';
import { canonicalHouseholdSettings } from './syncHouseholdBaseline';

const prisma = new PrismaClient();

async function main() {
  const { standard, households } = loadInitialData();
  const settings = canonicalHouseholdSettings(households.households);
  const [familyGroups, activeStandardCategories, activeProductTypes, activeRules] = await Promise.all([
    prisma.familyGroup.findMany({ select: { id: true } }),
    prisma.standardCategory.count({ where: { code: { in: standard.standardCategories.map((item) => item.code) }, isActive: true } }),
    prisma.productType.count({ where: { code: { in: standard.productTypes.map((item) => item.code) }, isActive: true } }),
    prisma.standardProductClassificationRule.findMany({
      where: { normalizedKeyword: { in: standard.standardProductClassificationRules.map((item) => item.normalizedKeyword) }, isActive: true },
      select: { normalizedKeyword: true, productType: { select: { code: true } } },
    }),
  ]);

  let missingCategories = 0;
  let missingStores = 0;
  let missingPrompts = 0;
  let inactiveReceiptAnalysisPrompts = 0;
  for (const familyGroup of familyGroups) {
    const [categories, stores, prompts] = await Promise.all([
      prisma.category.findMany({ where: { familyGroupId: familyGroup.id, name: { in: settings.categories.map((item) => item.name) } }, select: { name: true } }),
      prisma.store.findMany({ where: { familyGroupId: familyGroup.id, officialName: { in: settings.stores.map((item) => item.officialName) } }, select: { officialName: true } }),
      prisma.promptTemplate.findMany({ where: { familyGroupId: familyGroup.id, key: { in: households.promptTemplates.map((item) => item.key) } }, select: { key: true, isActive: true } }),
    ]);
    missingCategories += settings.categories.length - new Set(categories.map((item) => item.name)).size;
    missingStores += settings.stores.length - new Set(stores.map((item) => item.officialName)).size;
    missingPrompts += households.promptTemplates.length - new Set(prompts.map((item) => item.key)).size;
    if (!prompts.some((item) => item.key === 'RECEIPT_ANALYSIS' && item.isActive)) inactiveReceiptAnalysisPrompts += 1;
  }

  const expectedRuleKeys = new Set(standard.standardProductClassificationRules.map((item) => `${item.normalizedKeyword}\u0000${item.productTypeCode}`));
  const activeRuleKeys = new Set(activeRules.map((item) => `${item.normalizedKeyword}\u0000${item.productType.code}`));
  const standardMissing =
    activeStandardCategories !== standard.standardCategories.length ||
    activeProductTypes !== standard.productTypes.length ||
    expectedRuleKeys.size !== activeRuleKeys.size ||
    [...expectedRuleKeys].some((key) => !activeRuleKeys.has(key));
  const healthy = familyGroups.length > 0 && !standardMissing && missingCategories === 0 && missingStores === 0 && missingPrompts === 0 && inactiveReceiptAnalysisPrompts === 0;
  console.log(`baseline validation: status=${healthy ? 'pass' : 'fail'} familyGroups=${familyGroups.length} standardMissing=${standardMissing ? 1 : 0} missingCategories=${missingCategories} missingStores=${missingStores} missingPrompts=${missingPrompts} inactiveReceiptAnalysisPrompts=${inactiveReceiptAnalysisPrompts}`);
  if (!healthy) process.exitCode = 1;
}

main()
  .catch(() => {
    console.error('Baseline validation failed.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
