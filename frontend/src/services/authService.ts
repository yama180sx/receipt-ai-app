import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StoredSession } from '../types/auth';

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'userToken',
  ROLE: 'currentUserRole',
  MEMBER_ID: 'currentMemberId',
  MEMBER_NAME: 'currentMemberName',
  FAMILY_GROUP_ID: 'currentFamilyGroupId',
  FAMILY_GROUP_NAME: 'currentFamilyGroupName',
  INVITE_CODE: 'savedInviteCode',
  BIOMETRIC_ENABLED: 'biometricEnabled',
} as const;

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const authService = {
  async saveToken(token: string) {
    await setItem(AUTH_STORAGE_KEYS.TOKEN, token);
  },

  async getToken() {
    return getItem(AUTH_STORAGE_KEYS.TOKEN);
  },

  async saveRole(role: string) {
    await setItem(AUTH_STORAGE_KEYS.ROLE, role);
  },

  async getRole() {
    return getItem(AUTH_STORAGE_KEYS.ROLE);
  },

  async saveMemberId(memberId: number) {
    await setItem(AUTH_STORAGE_KEYS.MEMBER_ID, String(memberId));
  },

  async getMemberId(): Promise<number | null> {
    const value = await getItem(AUTH_STORAGE_KEYS.MEMBER_ID);
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  },

  async saveMemberName(name: string) {
    await setItem(AUTH_STORAGE_KEYS.MEMBER_NAME, name);
  },

  async getMemberName() {
    return getItem(AUTH_STORAGE_KEYS.MEMBER_NAME);
  },

  async saveFamilyGroupId(familyGroupId: number) {
    await setItem(AUTH_STORAGE_KEYS.FAMILY_GROUP_ID, String(familyGroupId));
  },

  async getFamilyGroupId(): Promise<number | null> {
    const value = await getItem(AUTH_STORAGE_KEYS.FAMILY_GROUP_ID);
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  },

  async saveFamilyGroupName(name: string) {
    await setItem(AUTH_STORAGE_KEYS.FAMILY_GROUP_NAME, name);
  },

  async getFamilyGroupName() {
    return getItem(AUTH_STORAGE_KEYS.FAMILY_GROUP_NAME);
  },

  /** 端末保持用（メンバー選択の再表示には使わない） */
  async saveInviteCode(inviteCode: string) {
    await setItem(AUTH_STORAGE_KEYS.INVITE_CODE, inviteCode);
  },

  async getInviteCode() {
    return getItem(AUTH_STORAGE_KEYS.INVITE_CODE);
  },

  async saveSession(session: {
    token: string;
    member: { id: number; name: string; familyGroupId: number; role: string };
    familyGroupName: string;
    inviteCode?: string;
  }) {
    await this.saveToken(session.token);
    await this.saveMemberId(session.member.id);
    await this.saveMemberName(session.member.name);
    await this.saveFamilyGroupId(session.member.familyGroupId);
    await this.saveFamilyGroupName(session.familyGroupName);
    if (session.member.role) {
      await this.saveRole(session.member.role);
    }
    if (session.inviteCode) {
      await this.saveInviteCode(session.inviteCode);
    }
  },

  async loadSession(): Promise<StoredSession | null> {
    const [token, memberId, memberName, familyGroupId, familyGroupName, role] =
      await Promise.all([
        this.getToken(),
        this.getMemberId(),
        this.getMemberName(),
        this.getFamilyGroupId(),
        this.getFamilyGroupName(),
        this.getRole(),
      ]);

    if (!token || memberId == null || familyGroupId == null) {
      return null;
    }

    return {
      token,
      memberId,
      memberName: memberName ?? '',
      familyGroupId,
      familyGroupName: familyGroupName ?? '',
      role,
    };
  },

  async logout() {
    await Promise.all(
      Object.values(AUTH_STORAGE_KEYS).map((key) => removeItem(key))
    );
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    if (Platform.OS === 'web') return;
    if (enabled) {
      await setItem(AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
    } else {
      await removeItem(AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED);
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const value = await getItem(AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  },
};
