export type ReceiptJobState =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

export type ReceiptJobListItem = {
  id: string;
  state: ReceiptJobState;
  imagePath: string | null;
  createdAt: number;
  failedReason?: string | null;
  parsedData?: {
    storeName: string;
    purchaseDate: string;
    totalAmount: number;
    taxAmount?: number;
    itemCount: number;
  };
  validation?: {
    isSuspicious: boolean;
    warnings: string[];
  };
  duplicateSuspected?: boolean;
  existingReceiptId?: number;
};

/** アップロード失敗など、サーバーにジョブが無いローカル行 */
export type LocalFailedReceiptJob = {
  id: string;
  state: 'failed';
  createdAt: number;
  failedReason: string;
  localOnly: true;
};

export type ReceiptTrayItem = ReceiptJobListItem | LocalFailedReceiptJob;
