import path from 'path';
import { receiptQueue } from '../queues/receiptQueue';
import { findReceiptIdByImagePath } from '../repositories/receiptRepository';

function normalizeImagePath(imagePath: string): string {
  return imagePath.replace(/\\/g, '/');
}

async function hasQueueJobForImage(
  familyGroupId: number,
  imagePath: string
): Promise<boolean> {
  const jobs = await receiptQueue.getJobs(
    ['completed', 'waiting', 'active', 'delayed', 'paused', 'failed'],
    0,
    200,
    true
  );

  return jobs.some(
    (job) =>
      Number(job.data?.familyGroupId) === familyGroupId &&
      normalizeImagePath(String(job.data?.imagePath ?? '')) === imagePath
  );
}

/**
 * 自世帯が参照可能なレシート画像か判定する。
 * - DB に保存済み Receipt
 * - 解析ジョブ投入済み（保存前プレビュー用。failed 含む — 解析失敗時もサムネイル表示）
 */
export async function canAccessReceiptImage(
  familyGroupId: number,
  imagePath: string
): Promise<boolean> {
  const normalized = normalizeImagePath(imagePath);

  const receipt = await findReceiptIdByImagePath(familyGroupId, normalized);
  if (receipt) return true;

  return hasQueueJobForImage(familyGroupId, normalized);
}

export function getImageFullPath(imagePath: string): string {
  return path.join(process.cwd(), normalizeImagePath(imagePath));
}
