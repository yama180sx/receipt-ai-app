import { mapProductTypesToSummary } from '../mappers/productClassificationMapper';
import { listActiveProductTypes } from '../services/productClassification/productTypeService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/sendApiResponse';

export const getProductTypes = asyncHandler(async (_req, res) => {
  const productTypes = await listActiveProductTypes();
  sendSuccess(res, mapProductTypesToSummary(productTypes));
});
