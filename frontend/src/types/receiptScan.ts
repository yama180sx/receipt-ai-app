export type ReceiptScanInitialData = {
  parsedData: {
    storeName: string;
    purchaseDate: string;
    totalAmount: number;
    taxAmount?: number | string;
    items: Array<{
      name: string;
      price: number | string;
      quantity: number | string;
      categoryId: number | null;
    }>;
    usageLogId?: number;
  };
  imagePath: string;
  validation: {
    isSuspicious: boolean;
    warnings: string[];
  };
  jobId?: string;
  duplicateSuspected?: boolean;
  existingReceiptId?: number | null;
  warnedDuplicateFromTray?: boolean;
};

type JobStatusResponse = {
  state: string;
  result?: {
    parsedData?: ReceiptScanInitialData['parsedData'];
    imagePath?: string;
    validation?: ReceiptScanInitialData['validation'];
  };
  duplicateSuspected?: boolean;
  existingReceiptId?: number | null;
};

export function buildScanInitialDataFromJobStatus(
  jobId: string,
  payload: JobStatusResponse
): ReceiptScanInitialData | null {
  if (payload.state !== 'completed' || !payload.result?.parsedData || !payload.result.imagePath) {
    return null;
  }

  return {
    parsedData: payload.result.parsedData,
    imagePath: payload.result.imagePath,
    validation: payload.result.validation ?? { isSuspicious: false, warnings: [] },
    jobId,
    duplicateSuspected: Boolean(payload.duplicateSuspected),
    existingReceiptId: payload.existingReceiptId ?? null,
    warnedDuplicateFromTray: Boolean(payload.duplicateSuspected),
  };
}
