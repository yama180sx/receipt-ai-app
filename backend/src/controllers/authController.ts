import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt'; // ★追加
import { generateToken } from '../utils/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';

/**
 * [Issue #54] ログイン処理 (bcrypt照合版)
 * メンバーIDとパスワードを受け取り、照合後にJWTを発行します。
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, password } = req.body; // ★ password を受け取る

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
    // マイグレーション直後は null なので、運用回避用のガードを入れます
    if (!member.password_hash) {
      throw new AppError('パスワードが設定されていません。管理者に連絡してください。', 403);
    }

    // 3. bcryptによるパスワード照合
    const isMatch = await bcrypt.compare(password, member.password_hash);
    if (!isMatch) {
      // セキュリティ上の定石として、ID間違いかパスワード間違いかは明示しません
      throw new AppError('メンバーIDまたはパスワードが正しくありません。', 401);
    }

    // 4. JWTの発行
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