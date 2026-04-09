import { Request, Response, NextFunction } from 'express';
import { runWithTenant } from '../utils/context';
import { prisma } from '../utils/prismaClient';
import logger from '../utils/logger';

/**
 * [Issue #51] 世帯コンテキスト特定ミドルウェア
 * authMiddleware でセットされた req.user を優先し、
 * なければヘッダーの x-member-id を参照します（移行期間用）。
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 認証済みのユーザーIDを優先取得
  const user = (req as any).user;
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

  try {
    // DBからメンバーの所属世帯を特定
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

    // セキュリティチェック: トークンの familyGroupId と DB の値が一致するか（もしペイロードにあれば）
    if (user?.familyGroupId && user.familyGroupId !== member.familyGroupId) {
      logger.warn(`[TENANT] Security Alert: Family Group Mismatch for Member ${memberId}`);
      return res.status(403).json({ 
        success: false, 
        message: '不正なアクセスです' 
      });
    }

    // 成功時: ALSにコンテキストを保存して次へ
    logger.info(`[TENANT] Context Set: Member ${memberId} (Group: ${member.familyGroupId})`);
    
    runWithTenant(
      { familyGroupId: member.familyGroupId, memberId: member.id },
      () => next()
    );

  } catch (error) {
    logger.error(`[TENANT] Database Error: ${error}`);
    res.status(500).json({ 
      success: false, 
      message: 'サーバー内部エラーが発生しました' 
    });
  }
};