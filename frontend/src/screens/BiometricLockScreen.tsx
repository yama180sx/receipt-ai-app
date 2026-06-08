import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { authenticateWithBiometric } from '../services/biometricService';
import { theme } from '../theme';

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
      <Text style={styles.title}>ロック中</Text>
      {memberName ? (
        <Text style={styles.subtitle}>{memberName} としてログイン済み</Text>
      ) : (
        <Text style={styles.subtitle}>生体認証でロックを解除してください</Text>
      )}

      {isAuthenticating ? (
        <ActivityIndicator size="large" color="white" style={styles.spinner} />
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={tryUnlock}>
          <Text style={styles.primaryButtonText}>生体認証で解除</Text>
        </TouchableOpacity>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <TouchableOpacity style={styles.linkButton} onPress={onUsePassword} disabled={isAuthenticating}>
        <Text style={styles.linkButtonText}>パスワードでログイン</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    padding: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 32,
    textAlign: 'center',
  },
  spinner: {
    marginVertical: 24,
  },
  primaryButton: {
    backgroundColor: 'white',
    width: '100%',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#ffcccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkButton: {
    padding: 12,
  },
  linkButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
