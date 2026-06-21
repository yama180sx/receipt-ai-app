import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DisplayModeSettings } from '../../../components/DisplayModeSettings';
import { theme } from '../../../theme';
import { devUiColors, isDevAppEnv } from '../../../config/appEnv';

export interface MainToolbarProps {
  memberName: string | null;
  biometricEnabled: boolean;
  onDisableBiometric: () => void;
  onLogout: () => void;
}

export function MainToolbar({
  memberName,
  biometricEnabled,
  onDisableBiometric,
  onLogout,
}: MainToolbarProps) {
  const devToolbarStyle = isDevAppEnv()
    ? { backgroundColor: devUiColors.toolbarBg, borderBottomColor: devUiColors.toolbarBorder }
    : null;

  return (
    <SafeAreaView edges={['top']} style={[styles.mainToolbar, devToolbarStyle]}>
      <View style={styles.topActions}>
        <DisplayModeSettings />
        <View style={styles.topActionButtons}>
          {memberName ? (
            <Text style={styles.memberNameText} numberOfLines={1}>
              {memberName}
            </Text>
          ) : null}
          {biometricEnabled && Platform.OS !== 'web' ? (
            <TouchableOpacity style={styles.topActionButton} onPress={onDisableBiometric}>
              <Text style={styles.topActionText}>生体認証オフ</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.topActionButton} onPress={onLogout}>
            <Text style={styles.topActionText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainToolbar: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  topActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  topActionButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 10,
  },
  topActionText: { color: theme.colors.text.muted, fontSize: 12, fontWeight: 'bold' },
  memberNameText: {
    color: theme.colors.text.main,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
});
