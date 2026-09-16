/** キューストア移行中は新規解析投入だけを停止し、閲覧・確定保存は継続する。 */
export function isReceiptAnalysisMaintenanceMode(): boolean {
  return process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE === 'true';
}
