import apiClient from '../utils/apiClient';
import type { CategorySummary } from '../types/receipt';
import type { ApiSuccessResponse } from './types';

/** カテゴリ API（/api/categories） */
export const categoryApi = {
  async listCategories(): Promise<ApiSuccessResponse<CategorySummary[]>> {
    const res = await apiClient.get('/categories');
    return res.data;
  },
};
