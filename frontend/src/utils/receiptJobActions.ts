import { receiptApi } from '../api/receiptApi';
import type { ReceiptScanInitialData } from '../types/receiptScan';
import { buildScanInitialDataFromJobStatus } from '../types/receiptScan';

export async function fetchReceiptScanInitialData(
  jobId: string
): Promise<ReceiptScanInitialData | null> {
  const res = await receiptApi.getJobStatus(jobId);
  if (!res.success) return null;
  return buildScanInitialDataFromJobStatus(jobId, res.data);
}

export async function discardReceiptJob(jobId: string): Promise<void> {
  await receiptApi.discardJob(jobId);
}
