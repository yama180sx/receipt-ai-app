import axios from 'axios';
import apiClient from '../utils/apiClient';
import type {
  AuthFamilyMember,
  LoginResponse,
  LoginResult,
  ResolvedFamily,
  TotpSetupInfo,
} from '../types/auth';
import type { ApiSuccessResponse } from './types';

function pendingClient(pendingToken: string) {
  return axios.create({
    baseURL: apiClient.defaults.baseURL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pendingToken}`,
    },
  });
}

/** 認証・TOTP API（/api/auth/*） */
export const authApi = {
  async resolveFamily(inviteCode: string): Promise<ResolvedFamily> {
    const res = await apiClient.post<ApiSuccessResponse<ResolvedFamily>>('/auth/resolve-family', {
      inviteCode: inviteCode.trim(),
    });
    return res.data.data;
  },

  async getFamilyMembers(familyGroupId: number, inviteCode: string): Promise<AuthFamilyMember[]> {
    const res = await apiClient.get<ApiSuccessResponse<AuthFamilyMember[]>>(
      `/auth/families/${familyGroupId}/members`,
      { params: { inviteCode: inviteCode.trim() } }
    );
    return res.data.data;
  },

  async login(familyGroupId: number, memberId: number, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<ApiSuccessResponse<LoginResponse>>('/auth/login', {
      familyGroupId,
      memberId,
      password,
    });
    return res.data.data;
  },

  async startTotpSetup(pendingToken: string): Promise<TotpSetupInfo> {
    const res = await pendingClient(pendingToken).post<ApiSuccessResponse<TotpSetupInfo>>(
      '/auth/totp/setup'
    );
    return res.data.data;
  },

  async confirmTotpSetup(pendingToken: string, code: string): Promise<LoginResult> {
    const res = await pendingClient(pendingToken).post<ApiSuccessResponse<LoginResponse>>(
      '/auth/totp/confirm',
      { code: code.trim() }
    );
    const data = res.data.data;
    if (!data.token) {
      throw new Error('トークンを取得できませんでした。');
    }
    return { token: data.token, member: data.member };
  },

  async verifyTotp(pendingToken: string, code: string): Promise<LoginResult> {
    const res = await pendingClient(pendingToken).post<ApiSuccessResponse<LoginResponse>>(
      '/auth/verify-totp',
      { code: code.trim() }
    );
    const data = res.data.data;
    if (!data.token) {
      throw new Error('トークンを取得できませんでした。');
    }
    return { token: data.token, member: data.member };
  },

  async enableTotpForUser(code: string): Promise<void> {
    await apiClient.post('/auth/totp/confirm', { code: code.trim() });
  },

  async startTotpSetupForUser(): Promise<TotpSetupInfo> {
    const res = await apiClient.post<ApiSuccessResponse<TotpSetupInfo>>('/auth/totp/setup');
    return res.data.data;
  },

  async disableTotp(password: string, code: string): Promise<void> {
    await apiClient.post('/auth/totp/disable', { password, code: code.trim() });
  },
};
