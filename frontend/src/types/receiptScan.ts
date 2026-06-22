/**
 * レシートスキャン（解析結果確認）型
 *
 * - ViewModel のみ（OpenAPI 非該当）
 * - 入力の ReceiptJobStatus（DTO）は api/generated を使用
 */

import type { ReceiptJobStatus } from '../api/generated';
import type { ParsedReceiptData } from './receipt';

/** 解析完了ジョブの result 内部 shape（ViewModel — OpenAPI result は汎用 object） */
export type ReceiptJobCompletedResult = {
  parsedData?: ParsedReceiptData;
  imagePath?: string;
  validation?: {
    isSuspicious: boolean;
    warnings: string[];
  };
};

/** スキャン画面の初期データ（ViewModel） */
export type ReceiptScanInitialData = {
  parsedData: ParsedReceiptData;
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

function parseJobResult(
  result: ReceiptJobStatus['result']
): ReceiptJobCompletedResult | undefined {
  if (!result || typeof result !== 'object') return undefined;
  return result as ReceiptJobCompletedResult;
}

export function buildScanInitialDataFromJobStatus(
  jobId: string,
  payload: ReceiptJobStatus
): ReceiptScanInitialData | null {
  const result = parseJobResult(payload.result);
  if (payload.state !== 'completed' || !result?.parsedData || !result.imagePath) {
    return null;
  }

  return {
    parsedData: result.parsedData,
    imagePath: result.imagePath,
    validation: result.validation ?? { isSuspicious: false, warnings: [] },
    jobId,
    duplicateSuspected: Boolean(payload.duplicateSuspected),
    existingReceiptId: payload.existingReceiptId ?? null,
    warnedDuplicateFromTray: Boolean(payload.duplicateSuspected),
  };
}
