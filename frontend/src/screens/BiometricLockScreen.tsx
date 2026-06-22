import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { authScreenStyles } from '../features/auth';
import { authenticateWithBiometric } from '../services/biometricService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Props = {
  memberName?: string;
  onUnlocked: () => void;
  onUsePassword: () => void;
};

export function BiometricLockScreen({ memberName, onUnlocked, onUsePassword }: Props) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tryUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        onUnlocked();
      } else {
        setErrorMessage('生体認証に失敗しました。もう一度お試しください。');
      }
    } catch {
      setErrorMessage('生体認証を利用できませんでした。');
    } finally {
      setIsAuthenticating(false);
    }
  }, [onUnlocked]);

  useEffect(() => {
    void tryUnlock();
  }, [tryUnlock]);

  return (
    <View style={styles.container}>
      <Text style={authScreenStyles.title}>ロック中</Text>
      {memberName ? (
        <Text style={authScreenStyles.subtitle}>{memberName} としてログイン済み</Text>
      ) : (
        <Text style={authScreenStyles.subtitle}>生体認証でロックを解除してください</Text>
      )}

      {isAuthenticating ? (
        <ActivityIndicator size="large" color={colors.text.inverse} style={styles.spinner} />
      ) : (
        <TouchableOpacity style={authScreenStyles.primaryButton} onPress={tryUnlock}>
          <Text style={[authScreenStyles.primaryButtonText, { color: colors.primary }]}>生体認証で解除</Text>
        </TouchableOpacity>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <TouchableOpacity style={authScreenStyles.linkButton} onPress={onUsePassword} disabled={isAuthenticating}>
        <Text style={authScreenStyles.linkButtonText}>パスワードでログイン</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...authScreenStyles.container,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.xl + spacing.sm,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  error: {
    color: 'rgba(255, 204, 204, 1)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md - 4,
  },
});
