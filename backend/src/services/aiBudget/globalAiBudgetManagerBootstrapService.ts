import { bootstrapGlobalAiBudgetManager } from '../../repositories/globalAiBudgetRepository';
import { AppError } from '../../utils/appError';

/**
 * デプロイ時CLI専用の初期・復旧登録サービス。
 * 通知・キューを初期化する通常の管理サービスへ依存させない。
 */
export async function bootstrapAiBudgetManager(input: { memberId: number; operatorName: string; reason: string }) {
  if (!input.operatorName.trim()) throw new AppError('実行者は必須です。', 400);
  if (!input.reason.trim()) throw new AppError('登録理由は必須です。', 400);
  return bootstrapGlobalAiBudgetManager(input);
}
