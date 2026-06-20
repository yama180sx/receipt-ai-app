import apiClient from '../utils/apiClient';
import type {
  AdvancedStatsData,
  ApiSuccessResponse,
  CreateSettlementTransferRequest,
  MonthlyStatsData,
  SettlementStatusData,
  SettlementTransfer,
} from './generated';

/** 統計・精算 API（/api/stats/*） */
export const statsApi = {
  async getMonthlyStats(month: string): Promise<ApiSuccessResponse<MonthlyStatsData>> {
    const res = await apiClient.get('/stats/monthly', { params: { month } });
    return res.data;
  },

  async getAdvancedStats(): Promise<ApiSuccessResponse<AdvancedStatsData>> {
    const res = await apiClient.get('/stats/advanced');
    return res.data;
  },

  async getSettlementStatus(month: string): Promise<ApiSuccessResponse<SettlementStatusData>> {
    const res = await apiClient.get('/stats/settlement', { params: { month } });
    return res.data;
  },

  async addSettlementTransfer(
    payload: CreateSettlementTransferRequest
  ): Promise<ApiSuccessResponse<SettlementTransfer>> {
    const res = await apiClient.post('/stats/settlement/transfers', payload);
    return res.data;
  },

  async deleteSettlementTransfer(id: number): Promise<ApiSuccessResponse<{ id: number }>> {
    const res = await apiClient.delete(`/stats/settlement/transfers/${id}`);
    return res.data;
  },
};

export type { AdvancedStatsData, MonthlyStatsData } from './generated';
