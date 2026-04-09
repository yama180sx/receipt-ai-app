import { Request, Response, NextFunction } from 'express';
import { generateToken } from '../utils/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';

/**
 * [Issue #52] ログイン処理
 * メンバーIDを受け取り、所属世帯情報を含むJWTを発行します。
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    const parsedId = parseInt(memberId, 10);

    // メンバーの存在確認（世帯情報もインクルード）
    const member = await prisma.familyMember.findUnique({
      where: { id: parsedId },
      include: { familyGroup: true }
    });

    if (!member || !member.familyGroup) {
      throw new AppError('指定されたメンバーまたは世帯が見つかりません。', 404);
    }

    // 更新された JWTPayload 型に基づきトークンを生成
    const token = generateToken({
      memberId: member.id,
      familyGroupId: member.familyGroup.id,
      name: member.name
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        member: {
          id: member.id,
          name: member.name,
          familyGroupId: member.familyGroupId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};