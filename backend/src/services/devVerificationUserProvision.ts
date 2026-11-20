export const devVerificationFamilyName = 'dev検証世帯';
export const devVerificationMemberName = 'dev検証ユーザー';

export type DevVerificationMember = {
  id: number;
  name: string;
  role: 'ADMIN' | 'USER';
};

export type DevVerificationFamily = {
  id: number;
  name: string;
  members: DevVerificationMember[];
};

export type DevVerificationUserProvisionRepository = {
  findVerificationFamilies: () => Promise<DevVerificationFamily[]>;
  findFamilyByInviteCode: (inviteCode: string) => Promise<DevVerificationFamily | null>;
  createFamilyWithUser: (input: { inviteCode: string; passwordHash: string }) => Promise<DevVerificationMember>;
};

export type DevVerificationUserProvisionInput = {
  inviteCode: string;
  password: string;
};

export type DevVerificationUserProvisionResult = {
  status: 'CREATED' | 'ALREADY_EXISTS';
  memberId: number;
};

function assertInput(input: DevVerificationUserProvisionInput): void {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(input.inviteCode)) {
    throw new Error('Verification-user provision input is invalid.');
  }
  if (input.password.length < 15 || input.password.length > 128 || input.password.includes('\n')) {
    throw new Error('Verification-user provision input is invalid.');
  }
}

/**
 * dev専用の手動受入アカウントを一度だけ作るための判定。
 * 固定名称の世帯・一般ユーザーを単一の識別子とし、入力招待コードは初回作成時だけ使う。
 * 既存レコードの更新・password再設定は扱わない。
 */
export async function provisionDevVerificationUser(
  input: DevVerificationUserProvisionInput,
  repository: DevVerificationUserProvisionRepository,
  hashPassword: (password: string) => Promise<string>
): Promise<DevVerificationUserProvisionResult> {
  assertInput(input);
  const existingFamilies = await repository.findVerificationFamilies();

  if (existingFamilies.length > 1) {
    throw new Error('Verification-user provision target conflicts with existing data.');
  }

  const existing = existingFamilies[0];
  if (existing) {
    const member = existing.members.find((candidate) => candidate.name === devVerificationMemberName);
    if (
      existing.name !== devVerificationFamilyName ||
      !member ||
      member.role !== 'USER' ||
      existing.members.length !== 1
    ) {
      throw new Error('Verification-user provision target conflicts with existing data.');
    }
    return { status: 'ALREADY_EXISTS', memberId: member.id };
  }

  const familyUsingInviteCode = await repository.findFamilyByInviteCode(input.inviteCode);
  if (familyUsingInviteCode) {
    throw new Error('Verification-user provision target conflicts with existing data.');
  }

  const passwordHash = await hashPassword(input.password);
  const member = await repository.createFamilyWithUser({ inviteCode: input.inviteCode, passwordHash });
  return { status: 'CREATED', memberId: member.id };
}
