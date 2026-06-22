import type { Role } from '@prisma/client';
import type {
  AuthFamilyMember,
  LoginMember,
  LoginResponse,
  ResolvedFamily,
  TotpSetupInfo,
} from '../types/apiSchemas';

export type AuthMemberRecord = {
  id: number;
  name: string;
  familyGroupId: number;
  role: Role;
  totpEnabled: boolean;
};

export type LoginSessionDomain = {
  member: AuthMemberRecord;
  token: string | null;
  pendingToken: string | null;
  requiresTotpVerification: boolean;
  requiresTotpSetup: boolean;
};

export type TotpConfirmAccessDomain = {
  member: AuthMemberRecord;
  totpEnabled: true;
};

export function mapMemberToLoginMember(member: AuthMemberRecord): LoginMember {
  return {
    id: member.id,
    name: member.name,
    familyGroupId: member.familyGroupId,
    role: member.role,
    totpEnabled: member.totpEnabled,
  };
}

export function mapLoginSessionToResponse(domain: LoginSessionDomain): LoginResponse {
  return {
    token: domain.token,
    pendingToken: domain.pendingToken,
    member: mapMemberToLoginMember(domain.member),
    requiresTotpVerification: domain.requiresTotpVerification,
    requiresTotpSetup: domain.requiresTotpSetup,
  };
}

export function mapFamilyGroupToResolvedFamily(familyGroup: {
  id: number;
  name: string;
}): ResolvedFamily {
  return {
    familyGroupId: familyGroup.id,
    name: familyGroup.name,
  };
}

export function mapMembersToAuthFamilyMembers(
  members: Array<{ id: number; name: string }>
): AuthFamilyMember[] {
  return members.map((member) => ({
    id: member.id,
    name: member.name,
  }));
}

export function mapTotpSetupToApi(info: { secret: string; otpauthUrl: string }): TotpSetupInfo {
  return info;
}

export function mapTotpConfirmAccessToApi(domain: TotpConfirmAccessDomain) {
  return {
    member: mapMemberToLoginMember(domain.member),
    totpEnabled: domain.totpEnabled,
  };
}

export function toAuthMemberRecord(member: {
  id: number;
  name: string;
  familyGroupId: number;
  role: Role;
  totpEnabled: boolean;
}): AuthMemberRecord {
  return {
    id: member.id,
    name: member.name,
    familyGroupId: member.familyGroupId,
    role: member.role,
    totpEnabled: member.totpEnabled,
  };
}
