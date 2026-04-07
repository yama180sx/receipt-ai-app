import { Request, Response, NextFunction } from 'express';
import { runWithTenant } from '../utils/context';
import { prisma } from '../utils/prismaClient'; // シングルトン版
import logger from '../utils/logger';

/**
 * [Issue #45] 世帯コンテキスト特定ミドルウェア
 * * 1. リクエストから memberId を抽出
 * 2. DBから所属する familyGroupId を特定
 * 3. AsyncLocalStorage にコンテキストを保存して後続の処理(next)へ移譲
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 1. memberId の抽出 (Header, Query, Body の順)
  const memberIdStr = 
    req.headers['x-member-id'] || 
    req.query.memberId || 
    (req.body && req.body.memberId);
    
  const memberId = Number(memberIdStr);

  // 認証不要なルートや ID 不足時はデフォルト処理へ（または 401 制御）
  if (!memberId || isNaN(memberId)) {
    return next();
  }

  try {
    // 2. メンバーの存在確認と世帯IDの取得
    // ※ パフォーマンス向上のため select で必要なフィールドのみに絞り込む
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyGroupId: true }
    });

    if (!member) {
      logger.warn(`[TENANT] 無効な memberId: ${memberId} (IP: ${req.ip})`);
      return res.status(403).json({ 
        success: false, 
        error: '指定されたメンバーが見つかりません。' 
      });
    }

    // 3. コンテキストを保存して実行
    // context.ts で定義した runWithTenant ヘルパーを使用
    runWithTenant(
      { familyGroupId: member.familyGroupId, memberId },
      () => next()
    );

  } catch (error) {
    logger.error(`[TENANT] Middleware Error: ${error}`);
    // エラーハンドラーへ委譲
    next(error);
  }
};