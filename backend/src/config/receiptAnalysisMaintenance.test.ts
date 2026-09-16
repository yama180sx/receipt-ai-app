import { afterEach, describe, expect, it } from 'vitest';
import { isReceiptAnalysisMaintenanceMode } from './receiptAnalysisMaintenance';

const original = process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE;
afterEach(() => { process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE = original; });

describe('isReceiptAnalysisMaintenanceMode', () => {
  it('true のときだけ解析投入を停止する', () => {
    process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE = 'true';
    expect(isReceiptAnalysisMaintenanceMode()).toBe(true);
    process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE = 'false';
    expect(isReceiptAnalysisMaintenanceMode()).toBe(false);
  });
});
