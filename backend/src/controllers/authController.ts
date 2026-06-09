import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import {
  generateAccessToken,
  generatePendingToken,
  JWTPayload,
} from '../utils/auth';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';
import {
  buildOtpauthUrl,
  decryptSecretFromStorage,
  encryptSecretForStorage,
  generateTotpSecret,
  isTotpRequiredForRole,
  verifyTotpCode,
} from '../services/totpService';
import { getRouteParam } from '../utils/routeParams';

type AuthUser = JWTPayload;

function formatMember(member: {
  id: number;
  name: string;
  familyGroupId: number;
  role: Role;
  totpEnabled: boolean;
}) {
  return {
    id: member.id,
    name: member.name,
    familyGroupId: member.familyGroupId,
    role: member.role,
    totpEnabled: member.totpEnabled,
  };
}

function buildAccessResponse(member: {
  id: number;
  name: string;
  familyGroupId: number;
  role: Role;
  totpEnabled: boolean;
}) {
  const memberDto = formatMember(member);
  return {
    token: generateAccessToken({
      id: member.id,
      name: member.name,
      familyGroupId: member.familyGroupId,
      role: member.role,
    }),
    pendingToken: null,
    member: memberDto,
    requiresTotpVerification: false,
    requiresTotpSetup: false,
  };
}

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

export const getFamilyMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const familyGroupId = parseInt(getRouteParam(req, 'familyGroupId'), 10);
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

    const tokenInput = {
      id: member.id,
      name: member.name,
      familyGroupId: member.familyGroupId,
      role: member.role,
    };
    const memberDto = formatMember(member);

    if (member.totpEnabled) {
      res.status(200).json({
        success: true,
        data: {
          token: null,
          pendingToken: generatePendingToken(tokenInput, 'totp_pending'),
          member: memberDto,
          requiresTotpVerification: true,
          requiresTotpSetup: false,
        },
      });
      return;
    }

    if (isTotpRequiredForRole(member.role)) {
      res.status(200).json({
        success: true,
        data: {
          token: null,
          pendingToken: generatePendingToken(tokenInput, 'totp_setup'),
          member: memberDto,
          requiresTotpVerification: false,
          requiresTotpSetup: true,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: buildAccessResponse(member),
    });
  } catch (error) {
    next(error);
  }
};

/** TOTP セットアップ開始（pending setup またはログイン済み USER） */
export const startTotpSetup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const member = await prisma.familyMember.findUnique({ where: { id: user.id } });
    if (!member) {
      throw new AppError('メンバーが見つかりません。', 404);
    }
    if (member.totpEnabled) {
      throw new AppError('二要素認証は既に有効です。', 400);
    }

    const secret = generateTotpSecret();
    await prisma.familyMember.update({
      where: { id: member.id },
      data: {
        totpSecret: encryptSecretForStorage(secret),
        totpEnabled: false,
        totpVerifiedAt: null,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        secret,
        otpauthUrl: buildOtpauthUrl(member.name, secret),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** TOTP セットアップ完了 → フル JWT 発行（setup 時）または有効化のみ */
export const confirmTotpSetup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      throw new AppError('認証コードを入力してください。', 400);
    }

    const member = await prisma.familyMember.findUnique({ where: { id: user.id } });
    if (!member?.totpSecret) {
      throw new AppError('二要素認証のセットアップが開始されていません。', 400);
    }
    if (member.totpEnabled) {
      throw new AppError('二要素認証は既に有効です。', 400);
    }

    const secret = decryptSecretFromStorage(member.totpSecret);
    if (!verifyTotpCode(secret, code.trim())) {
      throw new AppError('認証コードが正しくありません。', 401);
    }

    const updated = await prisma.familyMember.update({
      where: { id: member.id },
      data: {
        totpEnabled: true,
        totpVerifiedAt: new Date(),
      },
    });

    const memberDto = formatMember(updated);
    const isSetupFlow = user.purpose === 'totp_setup';

    res.status(200).json({
      success: true,
      data: isSetupFlow
        ? buildAccessResponse(updated)
        : { member: memberDto, totpEnabled: true },
    });
  } catch (error) {
    next(error);
  }
};

/** ログイン時 TOTP 検証 */
export const verifyTotp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      throw new AppError('認証コードを入力してください。', 400);
    }

    const member = await prisma.familyMember.findUnique({ where: { id: user.id } });
    if (!member?.totpEnabled || !member.totpSecret) {
      throw new AppError('二要素認証が有効ではありません。', 400);
    }

    const secret = decryptSecretFromStorage(member.totpSecret);
    if (!verifyTotpCode(secret, code.trim())) {
      throw new AppError('認証コードが正しくありません。', 401);
    }

    res.status(200).json({
      success: true,
      data: buildAccessResponse(member),
    });
  } catch (error) {
    next(error);
  }
};

/** USER 任意: 二要素認証を無効化 */
export const disableTotp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { password, code } = req.body;
    if (!password || !code) {
      throw new AppError('パスワードと認証コードを入力してください。', 400);
    }

    const member = await prisma.familyMember.findUnique({ where: { id: user.id } });
    if (!member?.password_hash || !member.totpEnabled || !member.totpSecret) {
      throw new AppError('二要素認証が有効ではありません。', 400);
    }
    if (isTotpRequiredForRole(member.role)) {
      throw new AppError('管理者は二要素認証を無効にできません。', 403);
    }

    const passwordOk = await bcrypt.compare(password, member.password_hash);
    if (!passwordOk) {
      throw new AppError('パスワードが正しくありません。', 401);
    }

    const secret = decryptSecretFromStorage(member.totpSecret);
    if (!verifyTotpCode(secret, String(code).trim())) {
      throw new AppError('認証コードが正しくありません。', 401);
    }

    await prisma.familyMember.update({
      where: { id: member.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpVerifiedAt: null,
      },
    });

    res.status(200).json({
      success: true,
      data: { totpEnabled: false },
    });
  } catch (error) {
    next(error);
  }
};
