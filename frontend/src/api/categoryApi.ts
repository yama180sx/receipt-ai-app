import apiClient from '../utils/apiClient';
import type {
  ApiMessageResponse,
  ApiSuccessResponse,
  Category,
  CreateCategoryRequest,
  OptimizeCategoryResponse,
} from './generated';

/** カテゴリ API（/api/categories） */
export const categoryApi = {
  async listCategories(): Promise<ApiSuccessResponse<Category[]>> {
    const res = await apiClient.get('/categories');
    return res.data;
  },

  async createCategory(input: CreateCategoryRequest): Promise<ApiSuccessResponse<Category>> {
    const res = await apiClient.post('/categories', input);
    return res.data;
  },

  async deleteCategory(id: number): Promise<ApiMessageResponse> {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data;
  },

  async optimizeCategories(): Promise<ApiSuccessResponse<OptimizeCategoryResponse>> {
    const res = await apiClient.post('/categories/optimize', {});
    return res.data;
  },
};

export type { Category, CreateCategoryRequest, OptimizeCategoryResponse } from './generated';
