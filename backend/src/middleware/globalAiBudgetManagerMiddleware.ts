import type { NextFunction, Request, Response } from 'express';
import { isGlobalAiBudgetManager } from '../repositories/globalAiBudgetRepository';

/** 全体AI予算は世帯ADMINではなく、専用管理者だけが操作できる。 */
export async function requireGlobalAiBudgetManager(req: Request, res: Response, next: NextFunction) {
  const memberId = req.user?.id;
  if (!memberId || !(await isGlobalAiBudgetManager(memberId))) {
    return res.status(403).json({ success: false, code: 'GLOBAL_AI_BUDGET_FORBIDDEN', message: 'この操作を実行する権限がありません。' });
  }
  next();
}
