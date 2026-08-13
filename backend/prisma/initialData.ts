import fs from 'node:fs';
import path from 'node:path';

export type StandardCategorySeed = { code: string; name: string; parentCode: string | null; displayOrder: number };
export type ProductTypeSeed = { code: string; name: string; standardCategoryCode: string; displayOrder: number };
export type StandardRuleSeed = { normalizedKeyword: string; standardCategoryCode: string; productTypeCode: string; priority: number; reason: string };
export type HouseholdSetting = { inviteCode: string; categories: Array<{ name: string; color: string | null; keywords: string[]; isAdjustment: boolean }>; stores: Array<{ officialName: string; aliases: string[] }> };
export type PromptSeed = { key: string; name?: string; description?: string; systemPrompt: string; domainHints: Record<string, string> | null; isActive: boolean; version: number };

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds', name), 'utf8')) as T;
}

export function loadInitialData() {
  const standard = readJson<{ schemaVersion: number; standardCategories: StandardCategorySeed[]; productTypes: ProductTypeSeed[]; standardProductClassificationRules: StandardRuleSeed[] }>('standard_product_classification.json');
  const households = readJson<{ schemaVersion: number; households: HouseholdSetting[]; promptTemplates: PromptSeed[] }>('household_settings.json');
  const manifest = readJson<{ schemaVersion: number; expectedCounts: { standardCategories: number; productTypes: number; standardProductClassificationRules: number }; preservedUploadPaths: string[] }>('test-data-reset-manifest.json');
  if (standard.schemaVersion !== 1 || households.schemaVersion !== 1 || manifest.schemaVersion !== 1) throw new Error('Unsupported initial-data schema version.');
  if (standard.standardCategories.length !== manifest.expectedCounts.standardCategories || standard.productTypes.length !== manifest.expectedCounts.productTypes || standard.standardProductClassificationRules.length !== manifest.expectedCounts.standardProductClassificationRules) throw new Error('Initial-data count validation failed.');
  const categoryCodes = new Set(standard.standardCategories.map((item) => item.code));
  const productTypeCodes = new Set(standard.productTypes.map((item) => item.code));
  if (categoryCodes.size !== standard.standardCategories.length || productTypeCodes.size !== standard.productTypes.length) throw new Error('Initial-data contains duplicate master codes.');
  for (const category of standard.standardCategories) if (category.parentCode && !categoryCodes.has(category.parentCode)) throw new Error(`Missing parent category: ${category.parentCode}`);
  for (const productType of standard.productTypes) if (!categoryCodes.has(productType.standardCategoryCode)) throw new Error(`Missing product-type category: ${productType.standardCategoryCode}`);
  for (const rule of standard.standardProductClassificationRules) if (!categoryCodes.has(rule.standardCategoryCode) || !productTypeCodes.has(rule.productTypeCode)) throw new Error(`Missing rule reference: ${rule.normalizedKeyword}`);
  return { standard, households, manifest };
}
