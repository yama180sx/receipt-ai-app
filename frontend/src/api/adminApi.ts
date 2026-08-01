import apiClient from '../utils/apiClient';
import type {
  AdminCostStatRow,
  ApiMessageResponse,
  ApiSuccessResponse,
  CreateProductClassificationReclassificationRunRequest,
  CreatePromptTemplateRequest,
  ProductClassificationReclassificationRun,
  PromptTemplate,
  UpdatePromptTemplateRequest,
} from './generated';

/** 管理 API（/api/admin/*）— ADMIN + TOTP 必須 */
export const adminApi = {
  async getCostStats(): Promise<ApiSuccessResponse<AdminCostStatRow[]>> {
    const res = await apiClient.get('/admin/stats');
    return res.data;
  },

  async listPrompts(): Promise<ApiSuccessResponse<PromptTemplate[]>> {
    const res = await apiClient.get('/admin/prompts');
    return res.data;
  },

  async createPrompt(input: CreatePromptTemplateRequest): Promise<ApiSuccessResponse<PromptTemplate>> {
    const res = await apiClient.post('/admin/prompts', input);
    return res.data;
  },

  async updatePrompt(
    id: number,
    input: UpdatePromptTemplateRequest
  ): Promise<ApiSuccessResponse<PromptTemplate>> {
    const res = await apiClient.patch(`/admin/prompts/${id}`, input);
    return res.data;
  },

  async activatePrompt(id: number): Promise<ApiMessageResponse> {
    const res = await apiClient.patch(`/admin/prompts/${id}/activate`);
    return res.data;
  },

  async deletePrompt(id: number): Promise<ApiMessageResponse> {
    const res = await apiClient.delete(`/admin/prompts/${id}`);
    return res.data;
  },

  async createProductClassificationReclassificationRun(
    input: CreateProductClassificationReclassificationRunRequest
  ): Promise<ApiSuccessResponse<ProductClassificationReclassificationRun>> {
    const res = await apiClient.post('/admin/product-classification/reclassification-runs', input);
    return res.data;
  },
};

export type {
  AdminCostStatRow,
  CreateProductClassificationReclassificationRunRequest,
  ProductClassificationReclassificationRun,
  CreatePromptTemplateRequest,
  PromptTemplate,
  UpdatePromptTemplateRequest,
} from './generated';
