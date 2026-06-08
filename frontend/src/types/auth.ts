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
};

export type LoginResult = {
  token: string;
  member: LoginMember;
  requiresTwoFactor: boolean;
};

export type StoredSession = {
  token: string;
  memberId: number;
  memberName: string;
  familyGroupId: number;
  familyGroupName: string;
  role: string | null;
};
