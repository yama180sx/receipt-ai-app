import { Request, Response, NextFunction } from 'express';
import { runWithTenant } from '../utils/context';
import { prisma } from '../utils/prismaClient';
import logger from '../utils/logger';

/**
 * [Issue #45] 世帯コンテキスト特定ミドルウェア (デバッグ強化版)
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 1. 受信した全ヘッダーの確認 (必要に応じてコメントアウトを外してください)
  // console.log('[DEBUG-AUTH] Full Headers:', req.headers);

  const memberIdHeader = req.headers['x-member-id'];
  const memberIdQuery = req.query.memberId;
  const memberIdBody = req.body?.memberId;

  // ログ出力: どこから値を取得しようとしているか可視化
  console.log(`[DEBUG-TENANT] Incoming -> Header: "${memberIdHeader}", Query: "${memberIdQuery}", Body: "${memberIdBody}"`);

  const rawId = memberIdHeader || memberIdQuery || memberIdBody;
  const memberId = Number(rawId);

  // 2. IDが取得できない、または数値でない場合
  if (!rawId || isNaN(memberId)) {
    logger.warn(`[TENANT] 401 Unauthorized: memberId is missing or NaN. Path: ${req.path}`);
    return res.status(401).json({ 
      success: false, 
      message: `メンバーIDが未指定です (Received: ${rawId})`,
      debug_path: req.path
    });
  }

  try {
    // 3. DB問い合わせの直前ログ
    console.log(`[DEBUG-TENANT] Querying DB for memberId: ${memberId}`);

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyGroupId: true }
    });

    // 4. DBに存在しない場合
    if (!member) {
      logger.error(`[TENANT] 401 Unauthorized: Member ID ${memberId} NOT FOUND in database.`);
      return res.status(401).json({ 
        success: false, 
        message: `ID ${memberId} のメンバーがデータベースに存在しません。` 
      });
    }

    // 5. 成功ログ
    logger.info(`[TENANT] Auth OK: Member ${memberId} (Group: ${member.familyGroupId}) -> ${req.method} ${req.path}`);

    runWithTenant(
      { familyGroupId: member.familyGroupId, memberId: member.id },
      () => next()
    );

  } catch (error) {
    logger.error(`[TENANT] 500 Internal Server Error: ${error}`);
    res.status(500).json({ success: false, message: 'ミドルウェアでデータベースエラーが発生しました。' });
  }
};