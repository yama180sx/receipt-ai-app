import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTotpSettings } from '../features/auth';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borderRadius } from '../theme/radii';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';

type Props = {
  totpEnabled: boolean;
  onBack: () => void;
  onChanged: (enabled: boolean) => void;
};

export function TotpSettingsScreen({ totpEnabled, onBack, onChanged }: Props) {
  const totp = useTotpSettings({ onChanged });

  return (
    <View style={[screenLayout.container, styles.content]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← 戻る</Text>
      </TouchableOpacity>
      <Text style={styles.title}>二要素認証</Text>

      {totpEnabled ? (
        <>
          <Text style={styles.subtitle}>現在: 有効</Text>
          <Text style={styles.subtitle}>
            二要素認証は全メンバー必須のため、無効にできません。
          </Text>
        </>
      ) : totp.secret ? (
        <>
          <Text style={styles.subtitle}>認証アプリに以下のキーを登録してください</Text>
          <View style={[cardStyles.listCard, styles.secretBox]}>
            <Text style={styles.secret} selectable>
              {totp.secret}
            </Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="6桁コード"
            keyboardType="number-pad"
            maxLength={6}
            value={totp.code}
            onChangeText={totp.setCode}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={totp.handleConfirmEnable}
            disabled={totp.loading}
          >
            {totp.loading ? (
              <ActivityIndicator color={colors.primary} />
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
            onPress={totp.handleStartEnable}
            disabled={totp.loading}
          >
            {totp.loading ? (
              <ActivityIndicator color={colors.primary} />
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
  content: { padding: spacing.lg },
  backButton: { marginBottom: spacing.md },
  backText: { color: colors.primary, fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: spacing.sm, color: colors.text.main },
  subtitle: { fontSize: 15, color: colors.text.muted, marginBottom: spacing.lg },
  secretBox: { marginBottom: spacing.md },
  secret: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: spacing.md - 4,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.text.inverse, fontWeight: 'bold' },
});
