import apiClient from '../utils/apiClient';
import type {
  AdvancedStatsData,
  ApiSuccessResponse,
  CreateSettlementTransferRequest,
  MonthlyStatsData,
  SettlementStatusData,
  SettlementTransfer,
  ProductClassificationStatsData,
} from './generated';
import { requireSuccessResponse } from './responseContract';

/** 統計・精算 API（/api/stats/*） */
export const statsApi = {
  async getMonthlyStats(month: string): Promise<ApiSuccessResponse<MonthlyStatsData>> {
    const res = await apiClient.get('/stats/monthly', { params: { month } });
    return requireSuccessResponse<MonthlyStatsData>('/stats/monthly', res?.data);
  },

  async getAdvancedStats(): Promise<ApiSuccessResponse<AdvancedStatsData>> {
    const res = await apiClient.get('/stats/advanced');
    return requireSuccessResponse<AdvancedStatsData>('/stats/advanced', res?.data);
  },

  async getProductClassificationStats(month: string): Promise<ApiSuccessResponse<ProductClassificationStatsData>> {
    const res = await apiClient.get('/stats/product-classification', { params: { month } });
    return requireSuccessResponse<ProductClassificationStatsData>('/stats/product-classification', res?.data);
  },

  async getSettlementStatus(month: string): Promise<ApiSuccessResponse<SettlementStatusData>> {
    const res = await apiClient.get('/stats/settlement', { params: { month } });
    return requireSuccessResponse<SettlementStatusData>('/stats/settlement', res?.data);
  },

  async addSettlementTransfer(
    payload: CreateSettlementTransferRequest
  ): Promise<ApiSuccessResponse<SettlementTransfer>> {
    const res = await apiClient.post('/stats/settlement/transfers', payload);
    return requireSuccessResponse<SettlementTransfer>('/stats/settlement/transfers', res?.data);
  },

  async deleteSettlementTransfer(id: number): Promise<ApiSuccessResponse<{ id: number }>> {
    const res = await apiClient.delete(`/stats/settlement/transfers/${id}`);
    return requireSuccessResponse<{ id: number }>(`/stats/settlement/transfers/${id}`, res?.data);
  },
};

export type { AdvancedStatsData, MonthlyStatsData } from './generated';
