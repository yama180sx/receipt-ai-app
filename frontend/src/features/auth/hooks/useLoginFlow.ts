import { useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { devUiColors, isDevAppEnv } from '../../../config/appEnv';
import { loginService } from '../../../services/loginService';
import { theme } from '../../../theme';
import type { AuthFamilyMember, LoginResult, ResolvedFamily } from '../../../types/auth';
import { showAlert } from '../../../utils/alertMessage';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { LoginStep } from '../types';

type LoginSuccessContext = {
  familyName: string;
  inviteCode: string;
};

type UseLoginFlowOptions = {
  onLoginSuccess: (result: LoginResult, context: LoginSuccessContext) => void;
};

export function useLoginFlow({ onLoginSuccess }: UseLoginFlowOptions) {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<LoginStep>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [family, setFamily] = useState<ResolvedFamily | null>(null);
  const [members, setMembers] = useState<AuthFamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<AuthFamilyMember | null>(null);
  const [password, setPassword] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const accentColor = isDevAppEnv() ? devUiColors.loginPrimary : theme.colors.primary;
  const isTotpStep = step === 'totp_setup' || step === 'totp_verify';

  const finishLogin = (result: LoginResult) => {
    if (!family) return;
    onLoginSuccess(result, { familyName: family.name, inviteCode: inviteCode.trim() });
  };

  const resetToInvite = () => {
    setStep('invite');
    setFamily(null);
    setMembers([]);
    setSelectedMember(null);
    setPassword('');
    setPendingToken(null);
    setTotpSecret(null);
    setTotpCode('');
  };

  const goBackToMember = () => {
    setSelectedMember(null);
    setPassword('');
    setStep('member');
  };

  const scrollToFormBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleResolveFamily = async () => {
    if (!inviteCode.trim()) {
      showAlert('入力エラー', '招待コードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const resolved = await loginService.resolveFamily(inviteCode);
      const memberList = await loginService.getFamilyMembers(resolved.familyGroupId, inviteCode);
      setFamily(resolved);
      setMembers(memberList);
      setStep('member');
    } catch (e: unknown) {
      const message = getApiErrorMessage(
        e,
        '招待コードの確認に失敗しました。ネットワーク接続を確認してください。'
      );
      showAlert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (member: AuthFamilyMember) => {
    setSelectedMember(member);
    setPassword('');
    setStep('password');
  };

  const handleLogin = async () => {
    if (!family || !selectedMember) return;
    if (!password) {
      showAlert('入力エラー', 'パスワードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const response = await loginService.login(family.familyGroupId, selectedMember.id, password);

      if (response.token) {
        finishLogin({ token: response.token, member: response.member });
        return;
      }

      if (!response.pendingToken) {
        throw new Error('認証トークンを取得できませんでした。');
      }

      setPendingToken(response.pendingToken);

      if (response.requiresTotpSetup) {
        const setup = await loginService.startTotpSetup(response.pendingToken);
        setTotpSecret(setup.secret);
        setTotpCode('');
        setStep('totp_setup');
        return;
      }

      if (response.requiresTotpVerification) {
        setTotpCode('');
        setStep('totp_verify');
        return;
      }

      throw new Error('想定外のログイン応答です。');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'ログインに失敗しました。';
      showAlert('認証エラー', message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTotpSetup = async () => {
    if (!pendingToken || !totpCode.trim()) {
      showAlert('入力エラー', '認証アプリの6桁コードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const result = await loginService.confirmTotpSetup(pendingToken, totpCode);
      finishLogin(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '認証コードの確認に失敗しました。';
      showAlert('エラー', message);
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!pendingToken || !totpCode.trim()) {
      showAlert('入力エラー', '認証アプリの6桁コードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const result = await loginService.verifyTotp(pendingToken, totpCode);
      finishLogin(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '認証コードが正しくありません。';
      showAlert('認証エラー', message);
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTotpStep) return;
    const timer = setTimeout(scrollToFormBottom, 150);
    return () => clearTimeout(timer);
  }, [isTotpStep, totpSecret]);

  return {
    step,
    inviteCode,
    setInviteCode,
    family,
    members,
    selectedMember,
    password,
    setPassword,
    totpSecret,
    totpCode,
    setTotpCode,
    loading,
    accentColor,
    scrollRef,
    isTotpStep,
    scrollToFormBottom,
    handleResolveFamily,
    handleSelectMember,
    handleLogin,
    handleConfirmTotpSetup,
    handleVerifyTotp,
    resetToInvite,
    goBackToMember,
  };
}

export type LoginFlow = ReturnType<typeof useLoginFlow>;
