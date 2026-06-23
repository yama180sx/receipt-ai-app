import { openapiClient } from './openapiClient';
import { unwrapOpenApiResponse } from './openapiHttpError';
import type {
  ApiMessageResponse,
  ApiSuccessResponse,
  Category,
  CreateCategoryRequest,
  OptimizeCategoryResponse,
} from './generated';

/** カテゴリ API（/api/categories）— openapi-fetch + generated paths（#105-5 PoC） */
export const categoryApi = {
  async listCategories(): Promise<ApiSuccessResponse<Category[]>> {
    return (await unwrapOpenApiResponse(
      openapiClient.GET('/categories')
    )) as ApiSuccessResponse<Category[]>;
  },

  async createCategory(input: CreateCategoryRequest): Promise<ApiSuccessResponse<Category>> {
    return (await unwrapOpenApiResponse(
      openapiClient.POST('/categories', { body: input })
    )) as ApiSuccessResponse<Category>;
  },

  async deleteCategory(id: number): Promise<ApiMessageResponse> {
    return (await unwrapOpenApiResponse(
      openapiClient.DELETE('/categories/{id}', { params: { path: { id } } })
    )) as ApiMessageResponse;
  },

  async optimizeCategories(): Promise<ApiSuccessResponse<OptimizeCategoryResponse>> {
    return (await unwrapOpenApiResponse(
      openapiClient.POST('/categories/optimize')
    )) as ApiSuccessResponse<OptimizeCategoryResponse>;
  },
};

export type { Category, CreateCategoryRequest, OptimizeCategoryResponse } from './generated';
