import apiClient from '../utils/apiClient';
import type {
  ApiSuccessResponse,
  Category,
} from './generated';

/** カテゴリ API（/api/categories） */
export const categoryApi = {
  async listCategories(): Promise<ApiSuccessResponse<Category[]>> {
    const response = await apiClient.get<ApiSuccessResponse<Category[]>>('/categories');
    return response.data;
  },
};

export type { Category } from './generated';
