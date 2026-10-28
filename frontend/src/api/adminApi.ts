import apiClient from '../utils/apiClient';
import type {
  AdminCostStatRow,
  ApiMessageResponse,
  ApiSuccessResponse,
  CreateProductClassificationReclassificationRunRequest,
  CreatePromptTemplateRequest,
  ProductClassificationReclassificationRun,
  StandardProductClassificationRule,
  StandardProductClassificationRulePreview,
  UpsertStandardProductClassificationRuleRequest,
  PromptTemplate,
  UpdatePromptTemplateRequest,
} from './generated';
import { requireSuccessResponse } from './responseContract';

/** 管理 API（/api/admin/*）— ADMIN + TOTP 必須 */
export const adminApi = {
  async getGlobalAiBudget(): Promise<ApiSuccessResponse<{ setting: GlobalAiBudgetSetting | null }>> {
    const res = await apiClient.get('/admin/ai-budget'); return requireSuccessResponse('/admin/ai-budget', res?.data);
  },
  async updateGlobalAiBudget(input: UpdateGlobalAiBudgetInput): Promise<ApiSuccessResponse<GlobalAiBudgetSetting>> {
    const res = await apiClient.put('/admin/ai-budget', input); return requireSuccessResponse('/admin/ai-budget', res?.data);
  },
  async testGlobalAiBudgetNotification(channels: Array<'DISCORD' | 'EMAIL'>): Promise<ApiMessageResponse> {
    const res = await apiClient.post('/admin/ai-budget/notifications/test', { channels }); return res.data;
  },
  async listGlobalAiBudgetNotificationDeliveries(): Promise<ApiSuccessResponse<AiBudgetNotificationDelivery[]>> {
    const res = await apiClient.get('/admin/ai-budget/notifications'); return requireSuccessResponse('/admin/ai-budget/notifications', res?.data);
  },
  async listGlobalAiBudgetManagers(): Promise<ApiSuccessResponse<GlobalAiBudgetManager[]>> {
    const res = await apiClient.get('/admin/ai-budget/managers'); return requireSuccessResponse('/admin/ai-budget/managers', res?.data);
  },
  async listGlobalAiBudgetManagerCandidates(): Promise<ApiSuccessResponse<GlobalAiBudgetManagerCandidate[]>> {
    const res = await apiClient.get('/admin/ai-budget/manager-candidates'); return requireSuccessResponse('/admin/ai-budget/manager-candidates', res?.data);
  },
  async addGlobalAiBudgetManager(memberId: number, reason: string): Promise<ApiSuccessResponse<GlobalAiBudgetManager>> {
    const res = await apiClient.post('/admin/ai-budget/managers', { memberId, reason }); return requireSuccessResponse('/admin/ai-budget/managers', res?.data);
  },
  async removeGlobalAiBudgetManager(memberId: number, reason: string): Promise<ApiMessageResponse> {
    const res = await apiClient.delete(`/admin/ai-budget/managers/${memberId}`, { data: { reason } }); return res.data;
  },
  async getCostStats(): Promise<ApiSuccessResponse<AdminCostStatRow[]>> {
    const res = await apiClient.get('/admin/stats');
    return requireSuccessResponse<AdminCostStatRow[]>('/admin/stats', res?.data);
  },

  async listPrompts(): Promise<ApiSuccessResponse<PromptTemplate[]>> {
    const res = await apiClient.get('/admin/prompts');
    return requireSuccessResponse<PromptTemplate[]>('/admin/prompts', res?.data);
  },

  async createPrompt(input: CreatePromptTemplateRequest): Promise<ApiSuccessResponse<PromptTemplate>> {
    const res = await apiClient.post('/admin/prompts', input);
    return requireSuccessResponse<PromptTemplate>('/admin/prompts', res?.data);
  },

  async updatePrompt(
    id: number,
    input: UpdatePromptTemplateRequest
  ): Promise<ApiSuccessResponse<PromptTemplate>> {
    const res = await apiClient.patch(`/admin/prompts/${id}`, input);
    return requireSuccessResponse<PromptTemplate>(`/admin/prompts/${id}`, res?.data);
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
    return requireSuccessResponse<ProductClassificationReclassificationRun>(
      '/admin/product-classification/reclassification-runs',
      res?.data
    );
  },

  async listStandardProductClassificationRules(includeInactive = true): Promise<ApiSuccessResponse<StandardProductClassificationRule[]>> {
    const res = await apiClient.get('/admin/product-classification/standard-rules', { params: { includeInactive } });
    return requireSuccessResponse<StandardProductClassificationRule[]>(
      '/admin/product-classification/standard-rules',
      res?.data
    );
  },

  async previewStandardProductClassificationRule(keyword: string): Promise<ApiSuccessResponse<StandardProductClassificationRulePreview>> {
    const res = await apiClient.post('/admin/product-classification/standard-rules/preview', { keyword });
    return requireSuccessResponse<StandardProductClassificationRulePreview>(
      '/admin/product-classification/standard-rules/preview',
      res?.data
    );
  },

  async createStandardProductClassificationRule(input: UpsertStandardProductClassificationRuleRequest): Promise<ApiSuccessResponse<StandardProductClassificationRule>> {
    const res = await apiClient.post('/admin/product-classification/standard-rules', input);
    return requireSuccessResponse<StandardProductClassificationRule>(
      '/admin/product-classification/standard-rules',
      res?.data
    );
  },

  async updateStandardProductClassificationRule(id: number, input: UpsertStandardProductClassificationRuleRequest): Promise<ApiSuccessResponse<StandardProductClassificationRule>> {
    const res = await apiClient.patch(`/admin/product-classification/standard-rules/${id}`, input);
    return requireSuccessResponse<StandardProductClassificationRule>(
      `/admin/product-classification/standard-rules/${id}`,
      res?.data
    );
  },

  async deactivateStandardProductClassificationRule(id: number, reason: string): Promise<ApiSuccessResponse<StandardProductClassificationRule>> {
    const res = await apiClient.patch(`/admin/product-classification/standard-rules/${id}/deactivate`, { reason });
    return requireSuccessResponse<StandardProductClassificationRule>(
      `/admin/product-classification/standard-rules/${id}/deactivate`,
      res?.data
    );
  },
};

export type GlobalAiBudgetSetting = { isEnabled: boolean; monthlyBudgetJpy: number | string | null; warningPercent: number; criticalPercent: number; stopPercent: number; notifyDiscord: boolean; notificationEmails: string[]; isStopped: boolean };
export type UpdateGlobalAiBudgetInput = { isEnabled: boolean; monthlyBudgetJpy: number; warningPercent: number; criticalPercent: number; stopPercent: number; notifyDiscord: boolean; notificationEmails: string[]; reason: string };
export type AiBudgetNotificationDelivery = { id: number; kind: 'THRESHOLD' | 'TEST'; month: string; thresholdPercent: number; channel: 'DISCORD' | 'EMAIL'; recipient: string; status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'; attempts: number; sentAt: string | null; lastError: string | null; createdAt: string };
export type GlobalAiBudgetManagerMember = { id: number; name: string; familyGroupId: number; role: 'ADMIN' | 'USER'; totpEnabled: boolean };
export type GlobalAiBudgetManager = { id: number; memberId: number; createdAt: string; member: GlobalAiBudgetManagerMember };
export type GlobalAiBudgetManagerCandidate = GlobalAiBudgetManagerMember & { familyGroup: { name: string } };

export type {
  AdminCostStatRow,
  CreateProductClassificationReclassificationRunRequest,
  ProductClassificationReclassificationRun,
  StandardProductClassificationRule,
  StandardProductClassificationRulePreview,
  UpsertStandardProductClassificationRuleRequest,
  CreatePromptTemplateRequest,
  PromptTemplate,
  UpdatePromptTemplateRequest,
} from './generated';
