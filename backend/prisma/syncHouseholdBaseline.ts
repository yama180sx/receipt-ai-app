import { Prisma } from '@prisma/client';
import { loadInitialData, type HouseholdSetting, type PromptSeed } from './initialData';

type HouseholdBaselineClient = {
  familyGroup: { findMany: (args: { select: { id: true } }) => Promise<Array<{ id: number }>> };
  category: {
    findFirst: (args: { where: { familyGroupId: number; name: string }; select: { id: true } }) => Promise<{ id: number } | null>;
    create: (args: { data: { familyGroupId: number; name: string; color: string | null; keywords: string[]; isAdjustment: boolean } }) => Promise<unknown>;
  };
  store: {
    findFirst: (args: { where: { familyGroupId: number; officialName: string }; select: { id: true } }) => Promise<{ id: number } | null>;
    create: (args: { data: { familyGroupId: number; officialName: string; aliases: string[] } }) => Promise<unknown>;
  };
  promptTemplate: {
    findFirst: (args: { where: { familyGroupId: number; key: string }; select: { id: true } }) => Promise<{ id: number } | null>;
    create: (args: { data: { familyGroupId: number; key: string; name?: string; description?: string; systemPrompt: string; domainHints: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput; isActive: boolean; version: number } }) => Promise<unknown>;
  };
};

export type HouseholdBaselineResult = {
  familyGroups: number;
  categoriesCreated: number;
  storesCreated: number;
  promptsCreated: number;
};

export function canonicalHouseholdSettings(households: HouseholdSetting[]): HouseholdSetting {
  const setting = households.reduce<HouseholdSetting | undefined>((current, candidate) =>
    !current || candidate.categories.length > current.categories.length ? candidate : current, undefined);
  if (!setting) throw new Error('Household baseline settings are missing.');
  return setting;
}

function promptData(prompt: PromptSeed, familyGroupId: number) {
  return {
    familyGroupId,
    key: prompt.key,
    name: prompt.name,
    description: prompt.description,
    systemPrompt: prompt.systemPrompt,
    domainHints: prompt.domainHints ?? Prisma.JsonNull,
    isActive: prompt.isActive,
    version: prompt.version,
  };
}

/**
 * Adds only absent baseline records to every existing household.
 * Existing records are deliberately never updated: they may be household customizations.
 */
export async function syncHouseholdBaseline(prisma: HouseholdBaselineClient): Promise<HouseholdBaselineResult> {
  const { households } = loadInitialData();
  const settings = canonicalHouseholdSettings(households.households);
  const familyGroups = await prisma.familyGroup.findMany({ select: { id: true } });
  const result: HouseholdBaselineResult = { familyGroups: familyGroups.length, categoriesCreated: 0, storesCreated: 0, promptsCreated: 0 };

  for (const familyGroup of familyGroups) {
    for (const category of settings.categories) {
      const existing = await prisma.category.findFirst({ where: { familyGroupId: familyGroup.id, name: category.name }, select: { id: true } });
      if (!existing) {
        await prisma.category.create({ data: { familyGroupId: familyGroup.id, ...category } });
        result.categoriesCreated += 1;
      }
    }
    for (const store of settings.stores) {
      const existing = await prisma.store.findFirst({ where: { familyGroupId: familyGroup.id, officialName: store.officialName }, select: { id: true } });
      if (!existing) {
        await prisma.store.create({ data: { familyGroupId: familyGroup.id, ...store } });
        result.storesCreated += 1;
      }
    }
    for (const prompt of households.promptTemplates) {
      const existing = await prisma.promptTemplate.findFirst({ where: { familyGroupId: familyGroup.id, key: prompt.key }, select: { id: true } });
      if (!existing) {
        await prisma.promptTemplate.create({ data: promptData(prompt, familyGroup.id) });
        result.promptsCreated += 1;
      }
    }
  }
  return result;
}
