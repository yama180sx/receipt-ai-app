export type ResolvedFamily = {
  familyGroupId: number;
  name: string;
};

export type AuthFamilyMember = {
  id: number;
  name: string;
};

export type LoginMember = {
  id: number;
  name: string;
  familyGroupId: number;
  role: string;
  totpEnabled?: boolean;
};

export type LoginResponse = {
  token: string | null;
  pendingToken: string | null;
  member: LoginMember;
  requiresTotpVerification: boolean;
  requiresTotpSetup: boolean;
};

export type LoginResult = {
  token: string;
  member: LoginMember;
};

export type TotpSetupInfo = {
  secret: string;
  otpauthUrl: string;
};

export type StoredSession = {
  token: string;
  memberId: number;
  memberName: string;
  familyGroupId: number;
  familyGroupName: string;
  role: string | null;
};
