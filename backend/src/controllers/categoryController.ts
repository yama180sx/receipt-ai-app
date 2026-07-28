import { requireTenantContext } from '../utils/context';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/sendApiResponse';
import { listCategories } from '../services/category/categoryService';

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await listCategories(requireTenantContext());
  sendSuccess(res, categories);
});
