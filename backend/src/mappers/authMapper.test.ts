import { describe, expect, it } from 'vitest';
import {
  mapFamilyGroupToResolvedFamily,
  mapLoginSessionToResponse,
  mapMemberToLoginMember,
  mapMembersToAuthFamilyMembers,
  mapTotpSetupToApi,
} from './authMapper';

describe('authMapper', () => {
  const member = {
    id: 2,
    name: '太郎',
    familyGroupId: 1,
    role: 'ADMIN' as const,
    totpEnabled: true,
  };

  it('maps member to LoginMember', () => {
    expect(mapMemberToLoginMember(member)).toEqual({
      id: 2,
      name: '太郎',
      familyGroupId: 1,
      role: 'ADMIN',
      totpEnabled: true,
    });
  });

  it('maps login session to LoginResponse', () => {
    expect(
      mapLoginSessionToResponse({
        member,
        token: 'access-token',
        pendingToken: null,
        requiresTotpVerification: false,
        requiresTotpSetup: false,
      })
    ).toEqual({
      token: 'access-token',
      pendingToken: null,
      member: mapMemberToLoginMember(member),
      requiresTotpVerification: false,
      requiresTotpSetup: false,
    });
  });

  it('maps family group and invite members', () => {
    expect(mapFamilyGroupToResolvedFamily({ id: 5, name: '山田家' })).toEqual({
      familyGroupId: 5,
      name: '山田家',
    });

    expect(mapMembersToAuthFamilyMembers([{ id: 1, name: 'A' }])).toEqual([
      { id: 1, name: 'A' },
    ]);
  });

  it('maps totp setup info', () => {
    expect(
      mapTotpSetupToApi({
        secret: 'SECRET',
        otpauthUrl: 'otpauth://totp/test',
      })
    ).toEqual({
      secret: 'SECRET',
      otpauthUrl: 'otpauth://totp/test',
    });
  });
});
