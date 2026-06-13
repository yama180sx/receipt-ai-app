import apiClient from './apiClient';
import type { ReceiptScanInitialData } from '../types/receiptScan';
import { buildScanInitialDataFromJobStatus } from '../types/receiptScan';

export async function fetchReceiptScanInitialData(
  jobId: string
): Promise<ReceiptScanInitialData | null> {
  const res = await apiClient.get(`/receipts/status/${jobId}`);
  if (!res.data?.success) return null;
  return buildScanInitialDataFromJobStatus(jobId, res.data.data);
}

export async function discardReceiptJob(jobId: string): Promise<void> {
  await apiClient.delete(`/receipts/jobs/${jobId}`);
}
