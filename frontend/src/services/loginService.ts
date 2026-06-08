import apiClient from '../utils/apiClient';
import type { AuthFamilyMember, LoginResult, ResolvedFamily } from '../types/auth';

type SuccessEnvelope<T> = { success: true; data: T };

export const loginService = {
  async resolveFamily(inviteCode: string): Promise<ResolvedFamily> {
    const res = await apiClient.post<SuccessEnvelope<ResolvedFamily>>('/auth/resolve-family', {
      inviteCode: inviteCode.trim(),
    });
    return res.data.data;
  },

  async getFamilyMembers(
    familyGroupId: number,
    inviteCode: string
  ): Promise<AuthFamilyMember[]> {
    const res = await apiClient.get<SuccessEnvelope<AuthFamilyMember[]>>(
      `/auth/families/${familyGroupId}/members`,
      { params: { inviteCode: inviteCode.trim() } }
    );
    return res.data.data;
  },

  async login(
    familyGroupId: number,
    memberId: number,
    password: string
  ): Promise<LoginResult> {
    const res = await apiClient.post<SuccessEnvelope<LoginResult>>('/auth/login', {
      familyGroupId,
      memberId,
      password,
    });
    return res.data.data;
  },
};
