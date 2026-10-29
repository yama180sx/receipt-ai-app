import apiClient from '../utils/apiClient';
import type {
  ApiSuccessResponse,
  Category,
} from './generated';
import { requireSuccessResponse } from './responseContract';

/** カテゴリ API（/api/categories） */
export const categoryApi = {
  async listCategories(): Promise<ApiSuccessResponse<Category[]>> {
    const response = await apiClient.get<ApiSuccessResponse<Category[]>>('/categories');
    return requireSuccessResponse<Category[]>('/categories', response?.data);
  },
};

export type { Category } from './generated';
