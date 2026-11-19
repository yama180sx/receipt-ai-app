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
 * 既存レコードの更新・password再設定は扱わない。
 */
export async function provisionDevVerificationUser(
  input: DevVerificationUserProvisionInput,
  repository: DevVerificationUserProvisionRepository,
  hashPassword: (password: string) => Promise<string>
): Promise<DevVerificationUserProvisionResult> {
  assertInput(input);
  const existing = await repository.findFamilyByInviteCode(input.inviteCode);

  if (existing) {
    const member = existing.members.find((candidate) => candidate.name === devVerificationMemberName);
    if (
      existing.name !== devVerificationFamilyName ||
      !member ||
      member.role !== 'USER'
    ) {
      throw new Error('Verification-user provision target conflicts with existing data.');
    }
    return { status: 'ALREADY_EXISTS', memberId: member.id };
  }

  const passwordHash = await hashPassword(input.password);
  const member = await repository.createFamilyWithUser({ inviteCode: input.inviteCode, passwordHash });
  return { status: 'CREATED', memberId: member.id };
}
