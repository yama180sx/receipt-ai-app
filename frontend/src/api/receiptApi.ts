import apiClient from '../utils/apiClient';
import type { ParsedReceiptData } from '../types/receipt';
import type { ItemSplitSavePayload } from '../types/settlement';
import type {
  ApiMessageResponse,
  ApiSuccessResponse,
  FamilyMemberSummary,
  ItemSplitSummary,
  ReceiptDetail,
  ReceiptItemDetail,
  ReceiptJobListItem,
  ReceiptJobStatus,
} from './generated';

export type ListReceiptsParams = {
  month?: string;
  memberId?: string;
};

export type CommitReceiptPayload = {
  jobId?: string;
  parsedData: ParsedReceiptData & { totalAmount: number; taxAmount: number };
  imagePath: string;
  validation: { isSuspicious: boolean; warnings: string[] };
};

export type ItemSplitSaveRequest = ItemSplitSavePayload & {
  ratio?: number;
};

export type ReceiptJobStatusResponse = ApiSuccessResponse<ReceiptJobStatus>;

/** レシート・ジョブ・按分 API（/api/receipts/*, /family-groups/members） */
export const receiptApi = {
  async listReceipts(params: ListReceiptsParams = {}): Promise<ApiSuccessResponse<ReceiptDetail[]>> {
    const res = await apiClient.get('/receipts', { params });
    return res.data;
  },

  async getLatestReceipt(memberId: number): Promise<ApiSuccessResponse<ReceiptDetail | null>> {
    const res = await apiClient.get('/receipts/latest', { params: { memberId } });
    return res.data;
  },

  async updateReceipt(
    receiptId: number,
    payload: Record<string, unknown>
  ): Promise<ApiSuccessResponse<ReceiptDetail>> {
    const res = await apiClient.patch(`/receipts/${receiptId}`, payload);
    return res.data;
  },

  async updateItemCategory(
    itemId: number,
    categoryId: number
  ): Promise<ApiSuccessResponse<ReceiptItemDetail>> {
    const res = await apiClient.patch(`/receipts/items/${itemId}`, { categoryId });
    return res.data;
  },

  async commitReceipt(payload: CommitReceiptPayload): Promise<ApiSuccessResponse<ReceiptDetail>> {
    const res = await apiClient.post('/receipts/commit', payload);
    return res.data;
  },

  async uploadReceipt(
    formData: FormData,
    memberId: number
  ): Promise<ApiSuccessResponse<{ jobId: string; status?: string }>> {
    const res = await apiClient.post('/receipts/upload', formData, {
      headers: { 'x-member-id': memberId.toString() },
    });
    return res.data;
  },

  async listJobs(): Promise<ApiSuccessResponse<ReceiptJobListItem[]>> {
    const res = await apiClient.get('/receipts/jobs');
    return res.data;
  },

  async getJobStatus(jobId: string): Promise<ReceiptJobStatusResponse> {
    const res = await apiClient.get(`/receipts/status/${jobId}`);
    return res.data;
  },

  async discardJob(jobId: string): Promise<ApiMessageResponse> {
    const res = await apiClient.delete(`/receipts/jobs/${jobId}`);
    return res.data;
  },

  async getFamilyMembers(): Promise<ApiSuccessResponse<FamilyMemberSummary[]>> {
    const res = await apiClient.get('/family-groups/members');
    return res.data;
  },

  async saveItemSplits(
    itemId: number,
    splits: ItemSplitSaveRequest[]
  ): Promise<ApiSuccessResponse<ItemSplitSummary[] | { message: string }>> {
    const res = await apiClient.post(`/receipts/items/${itemId}/splits`, { splits });
    return res.data;
  },
};
