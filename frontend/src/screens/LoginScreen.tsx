import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type LoginStep = 'invite' | 'member' | 'password';

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
  const [loading, setLoading] = useState(false);

  const resetToInvite = () => {
    setStep('invite');
    setFamily(null);
    setMembers([]);
    setSelectedMember(null);
    setPassword('');
  };

  const handleResolveFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('入力エラー', '招待コードを入力してください。');
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
      Alert.alert('エラー', message);
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
      Alert.alert('入力エラー', 'パスワードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const result = await loginService.login(
        family.familyGroupId,
        selectedMember.id,
        password
      );
      onLoginSuccess(result, { familyName: family.name, inviteCode: inviteCode.trim() });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'ログインに失敗しました。';
      Alert.alert('認証エラー', message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

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
      <Text style={styles.title}>家計簿アプリ</Text>
      {step === 'invite' && renderInviteStep()}
      {step === 'member' && renderMemberStep()}
      {step === 'password' && renderPasswordStep()}
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
    marginBottom: 10,
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
