import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'userToken';
// [Issue #73] Role保存用のキー
const ROLE_KEY = 'currentUserRole';

export const authService = {
  // トークンを保存する
  async saveToken(token: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  },
  // 保存されているトークンを読み出す
  async getToken() {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  },
  // [Issue #73] Roleを保存する
  async saveRole(role: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(ROLE_KEY, role);
    } else {
      await SecureStore.setItemAsync(ROLE_KEY, role);
    }
  },
  // [Issue #73] 保存されているRoleを読み出す
  async getRole() {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(ROLE_KEY);
    } else {
      return await SecureStore.getItemAsync(ROLE_KEY);
    }
  },
  // ログアウト時にトークンとRoleを消去する
  async logout() {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(ROLE_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(ROLE_KEY);
    }
  }
};