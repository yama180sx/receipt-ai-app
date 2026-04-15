import { Request, Response, NextFunction } from 'express';
import { runWithTenant } from '../utils/context';
import { prisma } from '../utils/prismaClient';
import logger from '../utils/logger';

/**
 * [Issue #51/46 修正版] 世帯コンテキスト特定ミドルウェア
 * * 修正点:
 * 1. authMiddleware で検証済みの req.user を優先利用
 * 2. AsyncLocalStorage の runWithTenant 内で確実に next() を実行
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // authMiddleware (JWT) からの情報を取得
    const user = (req as any).user;
    
    // JWTがない場合のフォールバック（移行期間用）
    const rawMemberId = user?.id || req.headers['x-member-id'];
    const memberId = Number(rawMemberId);

    if (!rawMemberId || isNaN(memberId)) {
      logger.warn(`[TENANT] 401 Unauthorized: memberId is missing. Path: ${req.path}`);
      return res.status(401).json({ 
        success: false, 
        code: 'MEMBER_ID_REQUIRED',
        message: 'メンバー情報の特定に失敗しました' 
      });
    }

    // 最新の所属世帯情報をDBから取得（キャッシュ戦略が必要な場合は将来的に検討）
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyGroupId: true }
    });

    if (!member) {
      logger.error(`[TENANT] Member ID ${memberId} not found in database.`);
      return res.status(401).json({ 
        success: false, 
        message: '指定されたメンバーが存在しません' 
      });
    }

    // セキュリティチェック: JWT内のグループIDとDBのグループIDが不一致なら拒否
    if (user?.familyGroupId && user.familyGroupId !== member.familyGroupId) {
      logger.warn(`[TENANT] Security Alert: Family Group Mismatch for Member ${memberId}`);
      return res.status(403).json({ 
        success: false, 
        message: '所属グループの検証に失敗しました' 
      });
    }

    // --- ここが ALC の生命線 ---
    // runWithTenant のコールバック内で next() を呼ぶことで、
    // この後に続く controller や service 内で getFamilyGroupId() が使えるようになります。
    runWithTenant(
      { familyGroupId: member.familyGroupId, memberId: member.id },
      () => {
        logger.info(`[TENANT] Context Set: Member ${memberId} (Group: ${member.familyGroupId})`);
        next();
      }
    );

  } catch (error) {
    logger.error(`[TENANT] Middleware Error: ${error}`);
    // next(error) を呼ぶことで errorHandler に処理を委譲
    next(error);
  }
};