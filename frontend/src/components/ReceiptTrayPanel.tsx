import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './ui';
import { ReceiptJobTrayRow } from './ReceiptJobTrayRow';
import { theme } from '../theme';
import type { ReceiptTrayItem } from '../types/receiptJob';
import { groupReceiptTrayItems } from '../utils/receiptJobDisplay';

type Props = {
  items: ReceiptTrayItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  maxItems?: number;
  showSectionHeaders?: boolean;
  onOpenFullTray?: () => void;
};

export function ReceiptTrayPanel({
  items,
  emptyTitle = '確認待ちのレシートはありません',
  emptyDescription = '撮影したレシートの解析状況がここに表示されます。',
  maxItems,
  showSectionHeaders = true,
  onOpenFullTray,
}: Props) {
  const sections = useMemo(() => groupReceiptTrayItems(items), [items]);
  const totalCount = items.length;

  const visibleSections = useMemo(() => {
    if (maxItems == null) return sections;

    let remaining = maxItems;
    return sections
      .map((section) => {
        if (remaining <= 0) return { ...section, items: [] as ReceiptTrayItem[] };
        const slice = section.items.slice(0, remaining);
        remaining -= slice.length;
        return { ...section, items: slice };
      })
      .filter((section) => section.items.length > 0);
  }, [sections, maxItems]);

  const hiddenCount = maxItems != null ? Math.max(0, totalCount - maxItems) : 0;

  if (totalCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📥</Text>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyDescription}>{emptyDescription}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visibleSections.map((section) => (
        <View key={section.kind} style={styles.section}>
          {showSectionHeaders ? (
            <Text style={styles.sectionTitle}>
              {section.title}
              <Text style={styles.sectionCount}> ({section.items.length})</Text>
            </Text>
          ) : null}
          <View style={styles.sectionItems}>
            {section.items.map((item) => (
              <ReceiptJobTrayRow key={item.id} item={item} />
            ))}
          </View>
        </View>
      ))}

      {hiddenCount > 0 && onOpenFullTray ? (
        <AppButton
          title={`確認トレイを開く（他 ${hiddenCount} 件）`}
          variant="outline"
          size="sm"
          onPress={onOpenFullTray}
          style={styles.openFullButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionCount: { fontWeight: '600' },
  sectionItems: { gap: theme.spacing.sm },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surface,
  },
  emptyEmoji: { fontSize: 32, marginBottom: theme.spacing.sm },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.main,
    textAlign: 'center',
  },
  emptyDescription: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  openFullButton: { alignSelf: 'stretch' },
});
