import type { TenantContext } from '../../utils/context';
import { findCategoriesByFamilyGroup } from '../../repositories/categoryRepository';

export async function listCategories(ctx: TenantContext) {
  return findCategoriesByFamilyGroup(ctx.familyGroupId);
}
