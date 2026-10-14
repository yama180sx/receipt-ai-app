import { describe, expect, it, vi } from 'vitest';
import { loadInitialData } from '../../../prisma/initialData';
import { syncHouseholdBaseline } from '../../../prisma/syncHouseholdBaseline';

describe('syncHouseholdBaseline', () => {
  it('adds only missing household baseline records and is idempotent', async () => {
    const { households } = loadInitialData();
    const expectedCategories = Math.max(...households.households.map((setting) => setting.categories.length));
    const expectedStores = households.households[0].stores.length;
    const familyGroup = { findMany: vi.fn().mockResolvedValue([{ id: 10 }]) };
    const categories = new Set<string>();
    const stores = new Set<string>();
    const prompts = new Set<string>();
    const category = {
      findFirst: vi.fn(async ({ where }: { where: { name: string } }) => categories.has(where.name) ? { id: 1 } : null),
      create: vi.fn(async ({ data }: { data: { name: string } }) => { categories.add(data.name); }),
    };
    const store = {
      findFirst: vi.fn(async ({ where }: { where: { officialName: string } }) => stores.has(where.officialName) ? { id: 1 } : null),
      create: vi.fn(async ({ data }: { data: { officialName: string } }) => { stores.add(data.officialName); }),
    };
    const promptTemplate = {
      findFirst: vi.fn(async ({ where }: { where: { key: string } }) => prompts.has(where.key) ? { id: 1 } : null),
      create: vi.fn(async ({ data }: { data: { key: string } }) => { prompts.add(data.key); }),
    };
    const prisma = { familyGroup, category, store, promptTemplate };

    await expect(syncHouseholdBaseline(prisma)).resolves.toEqual({ familyGroups: 1, categoriesCreated: expectedCategories, storesCreated: expectedStores, promptsCreated: 2 });
    await expect(syncHouseholdBaseline(prisma)).resolves.toEqual({ familyGroups: 1, categoriesCreated: 0, storesCreated: 0, promptsCreated: 0 });
  });

  it('does not overwrite an existing custom category, store, or inactive prompt', async () => {
    const familyGroup = { findMany: vi.fn().mockResolvedValue([{ id: 10 }]) };
    const category = { findFirst: vi.fn().mockResolvedValue({ id: 1 }), create: vi.fn() };
    const store = { findFirst: vi.fn().mockResolvedValue({ id: 1 }), create: vi.fn() };
    const promptTemplate = { findFirst: vi.fn().mockResolvedValue({ id: 1, isActive: false }), create: vi.fn() };

    await syncHouseholdBaseline({ familyGroup, category, store, promptTemplate });

    expect(category.create).not.toHaveBeenCalled();
    expect(store.create).not.toHaveBeenCalled();
    expect(promptTemplate.create).not.toHaveBeenCalled();
  });
});
