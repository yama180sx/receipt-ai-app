import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { sendOk, sendSuccess } from '../utils/sendApiResponse';
import {
  listCategories,
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
} from '../services/category/categoryService';

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await listCategories(requireTenantContext());
  sendSuccess(res, categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await createCategoryService(requireTenantContext(), req.body);
  sendSuccess(res, category, 201);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await deleteCategoryService(requireTenantContext(), Number(getRouteParam(req, 'id')));
  sendOk(res);
});
