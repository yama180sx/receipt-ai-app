import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ReceiptJobThumbnail } from './ReceiptJobThumbnail';
import { AppButton } from './ui';
import { theme } from '../theme';
import type { ReceiptTrayItem } from '../types/receiptJob';
import {
  getReceiptTrayItemSubtitle,
  getReceiptTrayItemTitle,
  resolveReceiptTrayItemDisplay,
  type ReceiptJobDisplayKind,
} from '../utils/receiptJobDisplay';

type Props = {
  item: ReceiptTrayItem;
  onPress?: () => void;
  onDiscard?: () => void;
  canOpen?: boolean;
  canDiscard?: boolean;
};

function badgeStyle(kind: ReceiptJobDisplayKind) {
  switch (kind) {
    case 'failed':
      return styles.badgeFailed;
    case 'duplicate_suspected':
      return styles.badgeDuplicate;
    case 'ready':
      return styles.badgeReady;
    case 'processing':
      return styles.badgeProcessing;
    default:
      return styles.badgeQueued;
  }
}

export function ReceiptJobTrayRow({
  item,
  onPress,
  onDiscard,
  canOpen = false,
  canDiscard = false,
}: Props) {
  const display = resolveReceiptTrayItemDisplay(item);
  const isDuplicate = display.kind === 'duplicate_suspected';
  const imagePath = 'imagePath' in item ? item.imagePath : null;

  const content = (
    <>
      <ReceiptJobThumbnail imagePath={imagePath} />
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {getReceiptTrayItemTitle(item)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {getReceiptTrayItemSubtitle(item)}
        </Text>
        {isDuplicate ? (
          <Text style={styles.duplicateHint}>
            同じ店名・日付・金額のレシートが登録済みの可能性があります
          </Text>
        ) : null}
        {canOpen ? <Text style={styles.openHint}>タップして内容を確認</Text> : null}
      </View>
      <View style={[styles.badge, badgeStyle(display.kind)]}>
        {display.isActive ? (
          <ActivityIndicator size="small" color={theme.colors.text.inverse} />
        ) : (
          <Text style={styles.badgeText}>{display.label}</Text>
        )}
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.wrapper,
        isDuplicate && styles.wrapperDuplicate,
        display.kind === 'failed' && styles.wrapperFailed,
      ]}
    >
      {canOpen && onPress ? (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={onPress}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}

      {canDiscard && onDiscard ? (
        <View style={styles.actions}>
          <AppButton title="破棄" variant="outline" size="sm" onPress={onDiscard} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  wrapperDuplicate: {
    backgroundColor: theme.colors.semantic.warning.bg,
    borderColor: theme.colors.semantic.warning.border,
  },
  wrapperFailed: {
    backgroundColor: theme.colors.semantic.deficit.bg,
    borderColor: theme.colors.semantic.deficit.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  rowPressed: { opacity: 0.85 },
  main: { flex: 1, minWidth: 0 },
  title: {
    ...theme.typography.body,
    color: theme.colors.text.main,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  duplicateHint: {
    fontSize: 11,
    color: theme.colors.semantic.warning.text,
    marginTop: 4,
  },
  openHint: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  badge: {
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: theme.colors.text.inverse, fontSize: 11, fontWeight: '700' },
  badgeQueued: { backgroundColor: theme.colors.text.muted },
  badgeProcessing: { backgroundColor: theme.colors.primary },
  badgeReady: { backgroundColor: '#059669' },
  badgeDuplicate: { backgroundColor: '#d97706' },
  badgeFailed: { backgroundColor: theme.colors.semantic.deficit.text },
  actions: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    alignItems: 'flex-end',
  },
});
