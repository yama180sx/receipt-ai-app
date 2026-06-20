import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { categoryApi } from '../../../api/categoryApi';
import { setOnUnauthorized } from '../../../utils/apiClient';
import { authService } from '../../../services/authService';
import { canUseBiometric } from '../../../services/biometricService';
import type { LoginResult, StoredSession } from '../../../types/auth';
import type { CategorySummary } from '../../../types/receipt';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  RESULT: '@app_result',
};

export type AppViewType =
  | 'main'
  | 'history'
  | 'stats'
  | 'category_mgr'
  | 'product_master'
  | 'receipt_scan'
  | 'receipt_tray'
  | 'prompt_editor'
  | 'admin_stats'
  | 'admin_menu'
  | 'split_editor'
  | 'settlement_summary'
  | 'totp_settings';

export function useAppSession() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [currentMemberName, setCurrentMemberName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null);
  const [biometricLockActive, setBiometricLockActive] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [currentView, setCurrentView] = useState<AppViewType>('main');

  const applySession = useCallback((session: StoredSession) => {
    setUserToken(session.token);
    setCurrentMemberId(session.memberId);
    setCurrentMemberName(session.memberName);
    setCurrentUserRole(session.role);
  }, []);

  const fetchCategoriesForSession = useCallback(async () => {
    try {
      const catRes = await categoryApi.listCategories();
      if (catRes.success) {
        setCategories(catRes.data);
      }
    } catch (catErr) {
      console.error('起動時のカテゴリマスタ先行取得失敗:', catErr);
    }
  }, []);

  const clearSessionState = useCallback(() => {
    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentMemberName(null);
    setCurrentUserRole(null);
    setPendingSession(null);
    setBiometricLockActive(false);
    setBiometricEnabled(false);
    setTotpEnabled(false);
    setCurrentView('main');
    setCategories([]);
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    clearSessionState();
  }, [clearSessionState]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [session, bioEnabled, v] = await Promise.all([
          authService.loadSession(),
          authService.isBiometricEnabled(),
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
        ]);

        setBiometricEnabled(bioEnabled);

        if (session) {
          const needsBiometricLock = bioEnabled && Platform.OS !== 'web';
          if (needsBiometricLock) {
            setPendingSession(session);
            setBiometricLockActive(true);
          } else {
            applySession(session);
            await fetchCategoriesForSession();
          }
        }

        if (v) setCurrentView(v as AppViewType);
      } catch (e) {
        console.error('初期化失敗', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };
    void initializeApp();
  }, [applySession, fetchCategoriesForSession]);

  useEffect(() => {
    setOnUnauthorized(() => {
      void handleLogout();
      Alert.alert('セッション切れ', '有効期限が切れたため、再度ログインしてください。');
    });
  }, [handleLogout]);

  const promptEnableBiometric = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const available = await canUseBiometric();
    if (!available) return;

    Alert.alert(
      '生体認証',
      '次回起動時に生体認証でロック解除しますか？',
      [
        { text: 'あとで', style: 'cancel' },
        {
          text: '有効にする',
          onPress: async () => {
            await authService.setBiometricEnabled(true);
            setBiometricEnabled(true);
          },
        },
      ]
    );
  }, []);

  const handleLoginSuccess = useCallback(
    async (result: LoginResult, context: { familyName: string; inviteCode: string }) => {
      await authService.saveSession({
        token: result.token,
        member: result.member,
        familyGroupName: context.familyName,
        inviteCode: context.inviteCode,
      });

      applySession({
        token: result.token,
        memberId: result.member.id,
        memberName: result.member.name,
        familyGroupId: result.member.familyGroupId,
        familyGroupName: context.familyName,
        role: result.member.role,
      });
      setBiometricLockActive(false);
      setPendingSession(null);
      setTotpEnabled(Boolean(result.member.totpEnabled));
      await fetchCategoriesForSession();
      await promptEnableBiometric();
    },
    [applySession, fetchCategoriesForSession, promptEnableBiometric]
  );

  const handleBiometricUnlock = useCallback(async () => {
    if (!pendingSession) return;
    applySession(pendingSession);
    setBiometricLockActive(false);
    setPendingSession(null);
    await fetchCategoriesForSession();
  }, [applySession, fetchCategoriesForSession, pendingSession]);

  const handleUsePasswordFromLock = useCallback(async () => {
    await authService.logout();
    clearSessionState();
  }, [clearSessionState]);

  const handleDisableBiometric = useCallback(async () => {
    await authService.setBiometricEnabled(false);
    setBiometricEnabled(false);
    Alert.alert('生体認証', '生体認証によるロック解除をオフにしました。');
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!userToken) return;
    try {
      const res = await categoryApi.listCategories();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('マスタ取得失敗:', err);
    }
  }, [userToken]);

  useEffect(() => {
    if (isReady && userToken && categories.length === 0) {
      void fetchCategories();
    }
  }, [fetchCategories, isReady, userToken, categories.length]);

  return {
    isReady,
    userToken,
    currentMemberId,
    currentMemberName,
    currentUserRole,
    pendingSession,
    biometricLockActive,
    biometricEnabled,
    totpEnabled,
    setTotpEnabled,
    categories,
    currentView,
    setCurrentView,
    handleLoginSuccess,
    handleBiometricUnlock,
    handleUsePasswordFromLock,
    handleDisableBiometric,
    handleLogout,
    fetchCategories,
    storageKeys: STORAGE_KEYS,
  };
}
