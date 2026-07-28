import { openapiClient } from './openapiClient';
import { unwrapOpenApiResponse } from './openapiHttpError';
import type {
  ApiSuccessResponse,
  Category,
} from './generated';

/** カテゴリ API（/api/categories）— openapi-fetch + generated paths（#105-5 PoC） */
export const categoryApi = {
  async listCategories(): Promise<ApiSuccessResponse<Category[]>> {
    return (await unwrapOpenApiResponse(
      openapiClient.GET('/categories')
    )) as ApiSuccessResponse<Category[]>;
  },
};

export type { Category } from './generated';
