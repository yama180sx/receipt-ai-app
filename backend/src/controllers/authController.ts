import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';

/**
 * [Issue #54 / #73] ログイン処理 (bcrypt照合版)
 * メンバーIDとパスワードを受け取り、照合後にJWTを発行します。
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, password } = req.body;

    if (!memberId || !password) {
      throw new AppError('メンバーIDとパスワードを入力してください。', 400);
    }

    const parsedId = parseInt(memberId, 10);

    // 1. メンバーと所属世帯の取得
    const member = await prisma.familyMember.findUnique({
      where: { id: parsedId },
      include: { familyGroup: true }
    });

    if (!member || !member.familyGroup) {
      throw new AppError('指定されたメンバーまたは世帯が見つかりません。', 404);
    }

    // 2. パスワード未設定のチェック
    if (!member.password_hash) {
      throw new AppError('パスワードが設定されていません。管理者に連絡してください。', 403);
    }

    // 3. bcryptによるパスワード照合
    const isMatch = await bcrypt.compare(password, member.password_hash);
    if (!isMatch) {
      throw new AppError('メンバーIDまたはパスワードが正しくありません。', 401);
    }

    // 4. JWTの発行
    // [Issue #73] authMiddleware (isAdmin) で検証できるよう id を追加し、roleも含める
    const token = generateToken({
      id: member.id, // ← req.user.id 用に追加
      memberId: member.id,
      familyGroupId: member.familyGroup.id,
      name: member.name,
      role: member.role 
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        member: {
          id: member.id,
          name: member.name,
          familyGroupId: member.familyGroupId,
          role: member.role // ★フロントへ渡すための修正
        }
      }
    });
  } catch (error) {
    next(error);
  }
};