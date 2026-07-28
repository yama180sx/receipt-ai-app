import type { ProductType } from '@prisma/client';
import type { ProductTypeSummary } from '../types/apiSchemas';

export function mapProductTypesToSummary(productTypes: ProductType[]): ProductTypeSummary[] {
  return productTypes.map((productType) => ({
    id: productType.id,
    code: productType.code,
    name: productType.name,
    standardCategoryId: productType.standardCategoryId,
  }));
}
