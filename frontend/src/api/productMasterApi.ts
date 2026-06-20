import apiClient from '../utils/apiClient';
import type {
  ApiMessageResponse,
  ApiSuccessResponse,
  MergeStoreNamesRequest,
  MergeStoreNamesResponse,
  ProductMaster,
  UpdateProductMasterRequest,
} from './generated';

export type ListProductMastersParams = {
  q?: string;
  store?: string;
};

/** 商品マスタ API（/api/product-master） */
export const productMasterApi = {
  async listProductMasters(
    params: ListProductMastersParams = {}
  ): Promise<ApiSuccessResponse<ProductMaster[]>> {
    const res = await apiClient.get('/product-master', { params });
    return res.data;
  },

  async updateProductMaster(
    id: number,
    input: UpdateProductMasterRequest
  ): Promise<ApiSuccessResponse<ProductMaster>> {
    const res = await apiClient.patch(`/product-master/${id}`, input);
    return res.data;
  },

  async deleteProductMaster(id: number): Promise<ApiMessageResponse> {
    const res = await apiClient.delete(`/product-master/${id}`);
    return res.data;
  },

  async mergeStoreNames(
    input: MergeStoreNamesRequest
  ): Promise<ApiSuccessResponse<MergeStoreNamesResponse>> {
    const res = await apiClient.post('/product-master/merge-stores', input);
    return res.data;
  },
};

export type {
  MergeStoreNamesRequest,
  MergeStoreNamesResponse,
  ProductMaster,
  UpdateProductMasterRequest,
} from './generated';
