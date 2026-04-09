import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';

export const authService = {
  // トークンを保存する
  async saveToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  // 保存されているトークンを読み出す
  async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },
  // ログアウト時にトークンを消去する
  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};