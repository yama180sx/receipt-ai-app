import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loginService } from '../services/loginService';
import type { AuthFamilyMember, LoginResult, ResolvedFamily } from '../types/auth';
import { theme } from '../theme';
import { showAlert } from '../utils/alertMessage';

type LoginStep = 'invite' | 'member' | 'password' | 'totp_setup' | 'totp_verify';

type Props = {
  onLoginSuccess: (result: LoginResult, context: { familyName: string; inviteCode: string }) => void;
};

export function LoginScreen({ onLoginSuccess }: Props) {
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

  const handleResolveFamily = async () => {
    if (!inviteCode.trim()) {
      showAlert('入力エラー', '招待コードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const resolved = await loginService.resolveFamily(inviteCode);
      const memberList = await loginService.getFamilyMembers(
        resolved.familyGroupId,
        inviteCode
      );
      setFamily(resolved);
      setMembers(memberList);
      setStep('member');
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : '招待コードの確認に失敗しました。';
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
      const response = await loginService.login(
        family.familyGroupId,
        selectedMember.id,
        password
      );

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
      const message =
        e instanceof Error ? e.message : 'ログインに失敗しました。';
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

  const renderTotpStep = (isSetup: boolean) => (
    <>
      <Text style={styles.familyLabel}>{family?.name}</Text>
      <Text style={styles.subtitle}>
        {isSetup
          ? '二要素認証の設定（管理者必須）'
          : '二要素認証コードを入力'}
      </Text>
      {isSetup && totpSecret ? (
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>認証アプリに登録するキー</Text>
          <Text style={styles.secretText} selectable>
            {totpSecret}
          </Text>
        </View>
      ) : null}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="6桁コード"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={totpCode}
          onChangeText={setTotpCode}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={isSetup ? handleConfirmTotpSetup : handleVerifyTotp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Text style={styles.primaryButtonText}>{isSetup ? '設定を完了' : '確認'}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderInviteStep = () => (
    <>
      <Text style={styles.subtitle}>招待コードを入力してください</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="例: YAMAMOTO-2026"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleResolveFamily}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Text style={styles.primaryButtonText}>次へ</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderMemberStep = () => (
    <>
      <Text style={styles.familyLabel}>{family?.name}</Text>
      <Text style={styles.subtitle}>ログインするメンバーを選択</Text>
      <ScrollView style={styles.memberList} contentContainerStyle={styles.memberListContent}>
        {members.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={styles.memberButton}
            onPress={() => handleSelectMember(member)}
            disabled={loading}
          >
            <Text style={styles.memberButtonText}>{member.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.linkButton} onPress={resetToInvite} disabled={loading}>
        <Text style={styles.linkButtonText}>別の世帯でログイン</Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={styles.familyLabel}>{family?.name}</Text>
      <Text style={styles.subtitle}>{selectedMember?.name} としてログイン</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="パスワードを入力"
          placeholderTextColor="rgba(255,255,255,0.6)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          onSubmitEditing={handleLogin}
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Text style={styles.primaryButtonText}>ログイン</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setSelectedMember(null);
          setPassword('');
          setStep('member');
        }}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>メンバー選択に戻る</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkButton} onPress={resetToInvite} disabled={loading}>
        <Text style={styles.linkButtonText}>別の世帯でログイン</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RecAIpt</Text>
      <Text style={styles.tagline}>レシートで家計を管理</Text>
      {step === 'invite' && renderInviteStep()}
      {step === 'member' && renderMemberStep()}
      {step === 'password' && renderPasswordStep()}
      {step === 'totp_setup' && renderTotpStep(true)}
      {step === 'totp_verify' && renderTotpStep(false)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 16,
    textAlign: 'center',
  },
  familyLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  secretBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  secretLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 8,
  },
  secretText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    fontSize: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  primaryButton: {
    backgroundColor: 'white',
    width: '100%',
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  linkButton: {
    width: '100%',
    padding: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  memberList: {
    maxHeight: 280,
    width: '100%',
    marginBottom: 16,
  },
  memberListContent: {
    gap: 12,
  },
  memberButton: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  memberButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
