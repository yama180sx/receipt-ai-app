import bcrypt from 'bcrypt';
import { AppError } from '../utils/appError';
import {
  generateAccessToken,
  generatePendingToken,
  type TokenPurpose,
} from '../utils/auth';
import {
  buildOtpauthUrl,
  decryptSecretFromStorage,
  encryptSecretForStorage,
  generateTotpSecret,
  isTotpRequiredForRole,
  verifyTotpCode,
} from './totpService';
import {
  disableMemberTotp,
  enableMemberTotp,
  findFamilyGroupByIdAndInviteCode,
  findFamilyGroupByInviteCode,
  findMemberById,
  findMemberByIdWithFamily,
  findMembersByFamilyGroupId,
  saveMemberTotpSetup,
} from '../repositories/memberRepository';
import {
  type AuthMemberRecord,
  type LoginSessionDomain,
  type TotpConfirmAccessDomain,
  toAuthMemberRecord,
} from '../mappers/authMapper';

type AuthMemberSource = AuthMemberRecord & {
  password_hash?: string | null;
  totpSecret?: string | null;
};

function buildAccessSession(member: AuthMemberSource): LoginSessionDomain {
  const record = toAuthMemberRecord(member);
  return {
    member: record,
    token: generateAccessToken({
      id: record.id,
      name: record.name,
      familyGroupId: record.familyGroupId,
      role: record.role,
    }),
    pendingToken: null,
    requiresTotpVerification: false,
    requiresTotpSetup: false,
  };
}

function buildPendingSession(
  member: AuthMemberSource,
  purpose: 'totp_pending' | 'totp_setup'
): LoginSessionDomain {
  const record = toAuthMemberRecord(member);
  return {
    member: record,
    token: null,
    pendingToken: generatePendingToken(
      {
        id: record.id,
        name: record.name,
        familyGroupId: record.familyGroupId,
        role: record.role,
      },
      purpose
    ),
    requiresTotpVerification: purpose === 'totp_pending',
    requiresTotpSetup: purpose === 'totp_setup',
  };
}

export async function resolveFamilyByInviteCode(inviteCode: string) {
  const trimmed = inviteCode.trim();
  if (!trimmed) {
    throw new AppError('招待コードを入力してください。', 400);
  }

  const familyGroup = await findFamilyGroupByInviteCode(trimmed);
  if (!familyGroup) {
    throw new AppError('招待コードが正しくありません。', 404);
  }

  return familyGroup;
}

export async function listFamilyMembersForInvite(familyGroupId: number, inviteCode: string) {
  if (Number.isNaN(familyGroupId)) {
    throw new AppError('世帯IDが不正です。', 400);
  }

  const trimmedInviteCode = inviteCode.trim();
  if (!trimmedInviteCode) {
    throw new AppError('招待コードを指定してください。', 400);
  }

  const familyGroup = await findFamilyGroupByIdAndInviteCode(familyGroupId, trimmedInviteCode);
  if (!familyGroup) {
    throw new AppError('世帯が見つからないか、招待コードが一致しません。', 404);
  }

  return findMembersByFamilyGroupId(familyGroupId);
}

export async function loginMember(input: {
  familyGroupId: unknown;
  memberId: unknown;
  password: unknown;
}): Promise<LoginSessionDomain> {
  const { familyGroupId, memberId, password } = input;

  if (!familyGroupId || !memberId || !password) {
    throw new AppError('世帯ID、メンバーID、パスワードを入力してください。', 400);
  }

  const parsedFamilyGroupId = parseInt(String(familyGroupId), 10);
  const parsedMemberId = parseInt(String(memberId), 10);

  if (Number.isNaN(parsedFamilyGroupId) || Number.isNaN(parsedMemberId)) {
    throw new AppError('世帯IDまたはメンバーIDが不正です。', 400);
  }

  const member = await findMemberByIdWithFamily(parsedMemberId);
  if (!member || !member.familyGroup) {
    throw new AppError('指定されたメンバーまたは世帯が見つかりません。', 404);
  }

  if (member.familyGroupId !== parsedFamilyGroupId) {
    throw new AppError('メンバーIDまたはパスワードが正しくありません。', 401);
  }

  if (!member.password_hash) {
    throw new AppError('パスワードが設定されていません。管理者に連絡してください。', 403);
  }

  const isMatch = await bcrypt.compare(String(password), member.password_hash);
  if (!isMatch) {
    throw new AppError('メンバーIDまたはパスワードが正しくありません。', 401);
  }

  if (member.totpEnabled) {
    return buildPendingSession(member, 'totp_pending');
  }

  if (isTotpRequiredForRole(member.role)) {
    return buildPendingSession(member, 'totp_setup');
  }

  return buildAccessSession(member);
}

export async function startTotpSetupForMember(memberId: number) {
  const member = await findMemberById(memberId);
  if (!member) {
    throw new AppError('メンバーが見つかりません。', 404);
  }
  if (member.totpEnabled) {
    throw new AppError('二要素認証は既に有効です。', 400);
  }

  const secret = generateTotpSecret();
  await saveMemberTotpSetup(member.id, encryptSecretForStorage(secret));

  return {
    secret,
    otpauthUrl: buildOtpauthUrl(member.name, secret),
  };
}

export async function confirmTotpSetupForMember(
  memberId: number,
  code: string,
  purpose: TokenPurpose
): Promise<LoginSessionDomain | TotpConfirmAccessDomain> {
  if (!code.trim()) {
    throw new AppError('認証コードを入力してください。', 400);
  }

  const member = await findMemberById(memberId);
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

  const updated = await enableMemberTotp(member.id);

  if (purpose === 'totp_setup') {
    return buildAccessSession(updated);
  }

  return {
    member: toAuthMemberRecord(updated),
    totpEnabled: true,
  };
}

export async function verifyTotpForMember(
  memberId: number,
  code: string
): Promise<LoginSessionDomain> {
  if (!code.trim()) {
    throw new AppError('認証コードを入力してください。', 400);
  }

  const member = await findMemberById(memberId);
  if (!member?.totpEnabled || !member.totpSecret) {
    throw new AppError('二要素認証が有効ではありません。', 400);
  }

  const secret = decryptSecretFromStorage(member.totpSecret);
  if (!verifyTotpCode(secret, code.trim())) {
    throw new AppError('認証コードが正しくありません。', 401);
  }

  return buildAccessSession(member);
}

export async function disableTotpForMember(memberId: number, password: string, code: string) {
  if (!password || !code) {
    throw new AppError('パスワードと認証コードを入力してください。', 400);
  }

  const member = await findMemberById(memberId);
  if (!member?.password_hash || !member.totpEnabled || !member.totpSecret) {
    throw new AppError('二要素認証が有効ではありません。', 400);
  }
  if (isTotpRequiredForRole(member.role)) {
    throw new AppError('二要素認証は必須のため無効にできません。', 403);
  }

  const passwordOk = await bcrypt.compare(password, member.password_hash);
  if (!passwordOk) {
    throw new AppError('パスワードが正しくありません。', 401);
  }

  const secret = decryptSecretFromStorage(member.totpSecret);
  if (!verifyTotpCode(secret, String(code).trim())) {
    throw new AppError('認証コードが正しくありません。', 401);
  }

  await disableMemberTotp(member.id);
  return { totpEnabled: false as const };
}
