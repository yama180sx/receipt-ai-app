import apiClient from '../utils/apiClient';
import type { ParsedReceiptData } from '../types/receipt';
import type {
  ApiMessageResponse,
  ApiSuccessResponse,
  FamilyMemberSummary,
  ItemSplitInput,
  ItemSplitSummary,
  ReceiptDetail,
  ReceiptListPage,
  ReceiptItemDetail,
  ReceiptJobListItem,
  ReceiptJobStatus,
  ManualReceiptRequest,
  UploadJobResponse,
  ProductTypeSummary,
  ProductClassificationCandidateSummary,
  ProductClassificationReviewItem,
  ProductClassificationLearningData,
  ProductTypeStatus,
} from './generated';
import { requireSuccessResponse } from './responseContract';

export type ListReceiptsParams = {
  month?: string;
  memberId?: string;
  q?: string;
  limit?: number;
  cursor?: string;
};

export type CommitReceiptPayload = {
  jobId?: string;
  parsedData: ParsedReceiptData & { totalAmount: number; taxAmount: number };
  imagePath: string;
  validation: { isSuspicious: boolean; warnings: string[] };
};

export type ReceiptJobStatusResponse = ApiSuccessResponse<ReceiptJobStatus>;
export type ProductClassificationCorrectionScope =
  | 'item_only'
  | 'same_ocr_name';

export type ProductClassificationCorrectionPayload = {
  productTypeId: number;
  scope: ProductClassificationCorrectionScope;
};

export type ListProductClassificationReviewItemsParams = {
  statuses?: ProductTypeStatus[];
  categoryId?: number;
  month?: string;
};

/** レシート・ジョブ・按分 API（/api/receipts/*, /family-groups/members） */
export const receiptApi = {
  async listReceipts(params: ListReceiptsParams = {}): Promise<ApiSuccessResponse<ReceiptListPage>> {
    const res = await apiClient.get('/receipts', { params });
    return requireSuccessResponse<ReceiptListPage>('/receipts', res?.data);
  },

  async getReceipt(receiptId: number): Promise<ApiSuccessResponse<ReceiptDetail>> {
    const res = await apiClient.get(`/receipts/${receiptId}`);
    return requireSuccessResponse<ReceiptDetail>(`/receipts/${receiptId}`, res?.data);
  },

  async getLatestReceipt(memberId: number): Promise<ApiSuccessResponse<ReceiptDetail | null>> {
    const res = await apiClient.get('/receipts/latest', { params: { memberId } });
    return requireSuccessResponse<ReceiptDetail | null>('/receipts/latest', res?.data);
  },

  async updateReceipt(
    receiptId: number,
    payload: Record<string, unknown>
  ): Promise<ApiSuccessResponse<ReceiptDetail>> {
    const res = await apiClient.patch(`/receipts/${receiptId}`, payload);
    return requireSuccessResponse<ReceiptDetail>(`/receipts/${receiptId}`, res?.data);
  },

  async updateItemCategory(
    itemId: number,
    categoryId: number
  ): Promise<ApiSuccessResponse<ReceiptItemDetail>> {
    const res = await apiClient.patch(`/receipts/items/${itemId}`, { categoryId });
    return requireSuccessResponse<ReceiptItemDetail>(`/receipts/items/${itemId}`, res?.data);
  },

  async listProductTypes(): Promise<ApiSuccessResponse<ProductTypeSummary[]>> {
    const res = await apiClient.get('/product-types');
    return requireSuccessResponse<ProductTypeSummary[]>('/product-types', res?.data);
  },

  async updateItemProductClassification(
    itemId: number,
    payload: ProductClassificationCorrectionPayload
  ): Promise<ApiSuccessResponse<ReceiptItemDetail>> {
    const res = await apiClient.patch(`/receipts/items/${itemId}/product-classification`, payload);
    return requireSuccessResponse<ReceiptItemDetail>(
      `/receipts/items/${itemId}/product-classification`,
      res?.data
    );
  },

  async getItemProductClassificationCandidates(
    itemId: number
  ): Promise<ApiSuccessResponse<ProductClassificationCandidateSummary[]>> {
    const res = await apiClient.get(`/receipts/items/${itemId}/product-classification-candidates`);
    return requireSuccessResponse<ProductClassificationCandidateSummary[]>(
      `/receipts/items/${itemId}/product-classification-candidates`,
      res?.data
    );
  },

  async listProductClassificationReviewItems(
    params: ListProductClassificationReviewItemsParams = {}
  ): Promise<ApiSuccessResponse<ProductClassificationReviewItem[]>> {
    const { statuses, ...rest } = params;
    const res = await apiClient.get('/product-classification/review-items', {
      params: { ...rest, ...(statuses?.length ? { status: statuses.join(',') } : {}) },
    });
    return requireSuccessResponse<ProductClassificationReviewItem[]>(
      '/product-classification/review-items',
      res?.data
    );
  },

  async listProductClassificationLearningData(): Promise<ApiSuccessResponse<ProductClassificationLearningData[]>> {
    const res = await apiClient.get('/product-classification/learning-data');
    return requireSuccessResponse<ProductClassificationLearningData[]>(
      '/product-classification/learning-data',
      res?.data
    );
  },

  async deactivateProductClassificationLearningData(
    type: 'household_dictionary',
    id: number,
    reason: string
  ): Promise<ApiSuccessResponse<ProductClassificationLearningData>> {
    const res = await apiClient.patch(`/product-classification/learning-data/${type}/${id}/deactivate`, { reason });
    return requireSuccessResponse<ProductClassificationLearningData>(
      `/product-classification/learning-data/${type}/${id}/deactivate`,
      res?.data
    );
  },

  async commitReceipt(payload: CommitReceiptPayload): Promise<ApiSuccessResponse<ReceiptDetail>> {
    const res = await apiClient.post('/receipts/commit', payload);
    return requireSuccessResponse<ReceiptDetail>('/receipts/commit', res?.data);
  },

  async createManualReceipt(
    payload: ManualReceiptRequest
  ): Promise<ApiSuccessResponse<ReceiptDetail>> {
    const res = await apiClient.post('/receipts', payload);
    return requireSuccessResponse<ReceiptDetail>('/receipts', res?.data);
  },

  async uploadReceipt(
    formData: FormData,
    memberId: number
  ): Promise<ApiSuccessResponse<{ jobId: string; status?: string }>> {
    const res = await apiClient.post('/receipts/upload', formData, {
      headers: { 'x-member-id': memberId.toString() },
    });
    return requireSuccessResponse<{ jobId: string; status?: string }>('/receipts/upload', res?.data);
  },

  async listJobs(): Promise<ApiSuccessResponse<ReceiptJobListItem[]>> {
    const res = await apiClient.get('/receipts/jobs');
    return requireSuccessResponse<ReceiptJobListItem[]>('/receipts/jobs', res?.data);
  },

  async getJobStatus(jobId: string): Promise<ReceiptJobStatusResponse> {
    const res = await apiClient.get(`/receipts/status/${jobId}`);
    return requireSuccessResponse<ReceiptJobStatus>(`/receipts/status/${jobId}`, res?.data);
  },

  async discardJob(jobId: string): Promise<ApiMessageResponse> {
    const res = await apiClient.delete(`/receipts/jobs/${jobId}`);
    return res.data;
  },

  async retryJob(jobId: string): Promise<ApiSuccessResponse<UploadJobResponse>> {
    const res = await apiClient.post(`/receipts/jobs/${jobId}/retry`);
    return requireSuccessResponse<UploadJobResponse>(`/receipts/jobs/${jobId}/retry`, res?.data);
  },

  async getFamilyMembers(): Promise<ApiSuccessResponse<FamilyMemberSummary[]>> {
    const res = await apiClient.get('/family-groups/members');
    return requireSuccessResponse<FamilyMemberSummary[]>('/family-groups/members', res?.data);
  },

  async saveItemSplits(
    itemId: number,
    splits: ItemSplitInput[]
  ): Promise<ApiSuccessResponse<ItemSplitSummary[] | { message: string }>> {
    const res = await apiClient.post(`/receipts/items/${itemId}/splits`, { splits });
    return requireSuccessResponse<ItemSplitSummary[] | { message: string }>(
      `/receipts/items/${itemId}/splits`,
      res?.data
    );
  },
};
