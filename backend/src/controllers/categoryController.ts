import { Request, Response, NextFunction } from 'express';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import {
  listCategories,
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  optimizeCategoryKeywords,
} from '../services/category/categoryService';

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await listCategories(requireTenantContext());
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await createCategoryService(requireTenantContext(), req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteCategoryService(requireTenantContext(), Number(getRouteParam(req, 'id')));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const optimizeKeywords = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await optimizeCategoryKeywords(requireTenantContext());
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
