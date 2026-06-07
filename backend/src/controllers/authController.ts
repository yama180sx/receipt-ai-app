import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { generateToken } from '../utils/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';

/**
 * [Issue #93-2] Step 1: 招待コードから世帯を特定
 */
export const resolveFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      throw new AppError('招待コードを入力してください。', 400);
    }

    const familyGroup = await prisma.familyGroup.findUnique({
      where: { inviteCode: inviteCode.trim() },
      select: { id: true, name: true },
    });

    if (!familyGroup) {
      throw new AppError('招待コードが正しくありません。', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        familyGroupId: familyGroup.id,
        name: familyGroup.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * [Issue #93-2] Step 2: 世帯メンバー一覧（inviteCode で世帯アクセスを検証）
 */
export const getFamilyMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const familyGroupId = parseInt(req.params.familyGroupId, 10);
    const inviteCode = typeof req.query.inviteCode === 'string' ? req.query.inviteCode.trim() : '';

    if (Number.isNaN(familyGroupId)) {
      throw new AppError('世帯IDが不正です。', 400);
    }

    if (!inviteCode) {
      throw new AppError('招待コードを指定してください。', 400);
    }

    const familyGroup = await prisma.familyGroup.findFirst({
      where: { id: familyGroupId, inviteCode },
      select: { id: true },
    });

    if (!familyGroup) {
      throw new AppError('世帯が見つからないか、招待コードが一致しません。', 404);
    }

    const members = await prisma.familyMember.findMany({
      where: { familyGroupId },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

/** [#306 連携用] Admin は 2FA 必須、USER は任意 */
function requiresTwoFactor(role: Role): boolean {
  return role === Role.ADMIN;
}

/**
 * [Issue #54 / #73 / #93-2] Step 4: ログイン（familyGroupId 必須）
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId, memberId, password } = req.body;

    if (!familyGroupId || !memberId || !password) {
      throw new AppError('世帯ID、メンバーID、パスワードを入力してください。', 400);
    }

    const parsedFamilyGroupId = parseInt(familyGroupId, 10);
    const parsedMemberId = parseInt(memberId, 10);

    if (Number.isNaN(parsedFamilyGroupId) || Number.isNaN(parsedMemberId)) {
      throw new AppError('世帯IDまたはメンバーIDが不正です。', 400);
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: parsedMemberId },
      include: { familyGroup: true },
    });

    if (!member || !member.familyGroup) {
      throw new AppError('指定されたメンバーまたは世帯が見つかりません。', 404);
    }

    if (member.familyGroupId !== parsedFamilyGroupId) {
      throw new AppError('メンバーIDまたはパスワードが正しくありません。', 401);
    }

    if (!member.password_hash) {
      throw new AppError('パスワードが設定されていません。管理者に連絡してください。', 403);
    }

    const isMatch = await bcrypt.compare(password, member.password_hash);
    if (!isMatch) {
      throw new AppError('メンバーIDまたはパスワードが正しくありません。', 401);
    }

    const token = generateToken({
      id: member.id,
      memberId: member.id,
      familyGroupId: member.familyGroup.id,
      name: member.name,
      role: member.role,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        member: {
          id: member.id,
          name: member.name,
          familyGroupId: member.familyGroupId,
          role: member.role,
        },
        requiresTwoFactor: requiresTwoFactor(member.role),
      },
    });
  } catch (error) {
    next(error);
  }
};
