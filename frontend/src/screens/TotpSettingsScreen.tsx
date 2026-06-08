import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loginService } from '../services/loginService';
import { theme } from '../theme';

type Props = {
  totpEnabled: boolean;
  onBack: () => void;
  onChanged: (enabled: boolean) => void;
};

export function TotpSettingsScreen({ totpEnabled, onBack, onChanged }: Props) {
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartEnable = async () => {
    setLoading(true);
    try {
      const setup = await loginService.startTotpSetupForUser();
      setSecret(setup.secret);
      setCode('');
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : 'セットアップに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEnable = async () => {
    if (!code.trim()) {
      Alert.alert('入力エラー', '6桁コードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      await loginService.enableTotpForUser(code);
      setSecret(null);
      setCode('');
      onChanged(true);
      Alert.alert('完了', '二要素認証を有効にしました。');
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : '有効化に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password || !code.trim()) {
      Alert.alert('入力エラー', 'パスワードと6桁コードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      await loginService.disableTotp(password, code);
      setPassword('');
      setCode('');
      onChanged(false);
      Alert.alert('完了', '二要素認証を無効にしました。');
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : '無効化に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← 戻る</Text>
      </TouchableOpacity>
      <Text style={styles.title}>二要素認証</Text>

      {totpEnabled ? (
        <>
          <Text style={styles.subtitle}>現在: 有効</Text>
          <TextInput
            style={styles.input}
            placeholder="パスワード"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="6桁コード"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDisable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.dangerButtonText}>二要素認証を無効にする</Text>
            )}
          </TouchableOpacity>
        </>
      ) : secret ? (
        <>
          <Text style={styles.subtitle}>認証アプリに以下のキーを登録してください</Text>
          <Text style={styles.secret} selectable>
            {secret}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="6桁コード"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConfirmEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.primaryButtonText}>有効化</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>ログイン時に認証コードの入力が必要になります。</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.primaryButtonText}>セットアップを開始</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.colors.background },
  backButton: { marginBottom: 16 },
  backText: { color: theme.colors.primary, fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: theme.colors.text.main },
  subtitle: { fontSize: 15, color: theme.colors.text.muted, marginBottom: 20 },
  secret: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: 'white', fontWeight: 'bold' },
  dangerButton: {
    backgroundColor: '#c0392b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: { color: 'white', fontWeight: 'bold' },
});
