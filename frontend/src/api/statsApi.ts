import apiClient from '../utils/apiClient';
import type { SettlementStatusData, SettlementTransfer } from '../types/settlement';
import type { ApiSuccessResponse } from './types';

export type MonthlyStatsData = {
  month: string;
  totalAmount: number;
  stats: Array<{
    categoryId: number | null;
    categoryName: string;
    totalAmount: number | string;
    color: string;
  }>;
  latestReceipt: unknown;
};

export type AdvancedStatsData = {
  trend: Array<{ period: string; total: number; prev_total?: number | null }>;
  pareto: Array<{ name: string; amount: number; ratio: number; cumulative_ratio: number }>;
};

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

  async addSettlementTransfer(payload: {
    month: string;
    fromMemberId: number;
    toMemberId: number;
    amount: number;
  }): Promise<ApiSuccessResponse<SettlementTransfer>> {
    const res = await apiClient.post('/stats/settlement/transfers', payload);
    return res.data;
  },

  async deleteSettlementTransfer(id: number): Promise<ApiSuccessResponse<{ id: number }>> {
    const res = await apiClient.delete(`/stats/settlement/transfers/${id}`);
    return res.data;
  },
};
