export type {
  ResolvedFamily,
  AuthFamilyMember,
  LoginMember,
  LoginResponse,
  TotpSetupInfo,
} from '../api/generated';
import type { LoginMember } from '../api/generated';

export type LoginResult = {
  token: string;
  member: LoginMember;
};

export type StoredSession = {
  token: string;
  memberId: number;
  memberName: string;
  familyGroupId: number;
  familyGroupName: string;
  role: string | null;
};
