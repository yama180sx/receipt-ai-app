import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AppBackButton, AppButton } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { useIsWideLayout } from '../hooks/useIsWideLayout';
import {
  useSplitEditor,
  SplitEditorMemberChips,
  SplitEditorItemTable,
} from '../features/settlement';
import type { ReceiptForSplitEditor } from '../types/settlement';
import { useReceiptImageSource } from '../utils/receiptImageSource';

interface SplitEditorScreenProps {
  receipt: ReceiptForSplitEditor;
  onBack: () => void;
}

export const SplitEditorScreen: React.FC<SplitEditorScreenProps> = ({
  receipt,
  onBack,
}) => {
  const isWide = useIsWideLayout();
  const editor = useSplitEditor(receipt, onBack);
  const imageSource = useReceiptImageSource(receipt?.imagePath);

  if (editor.loading) {
    return (
      <View style={[screenLayout.container, styles.centerLoading]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={screenLayout.container}>
      <View style={[screenLayout.header, styles.headerSplit]}>
        <AppBackButton onPress={onBack} />
        <Text style={[screenLayout.headerTitle, styles.headerTitleSplit]}>割り勘エディタ</Text>
        <View style={styles.headerRight}>
          <AppButton
            title={BUTTON_LABELS.save}
            onPress={() => void editor.handleSave()}
            loading={editor.saving}
            disabled={editor.saving}
            size="sm"
          />
        </View>
      </View>

      <SplitEditorMemberChips
        activeMembers={editor.activeMembers}
        inactiveMembers={editor.inactiveMembers}
        onRemoveMember={editor.removeMember}
        onAddMember={editor.addMember}
      />

      <View style={[styles.mainLayout, isWide ? styles.rowLayout : styles.colLayout]}>
        <View style={[styles.imagePane, isWide && { width: 350 }]}>
          <View style={[cardStyles.chartCard, styles.imageBox]}>
            {imageSource ? (
              <Image source={imageSource} style={styles.receiptImage} resizeMode="contain" />
            ) : (
              <Text style={styles.noImageText}>画像がありません</Text>
            )}
          </View>
        </View>

        <View style={[cardStyles.chartCard, styles.editorPane]}>
          <View style={styles.editorToolbar}>
            <Text style={styles.storeName}>{receipt.storeName || '店名不明'}</Text>
          </View>

          <SplitEditorItemTable
            receipt={receipt}
            activeMembers={editor.activeMembers}
            editSplits={editor.editSplits}
            receiptTotalAmount={editor.receiptTotalAmount}
            onAmountChange={editor.handleAmountChange}
            onPercentChange={editor.handlePercentChange}
            onSplitItemEqually={editor.splitItemEqually}
            onTotalAmountChange={editor.handleTotalAmountChange}
            onTotalPercentChange={editor.handleTotalPercentChange}
            onSplitWholeReceiptEqually={editor.splitWholeReceiptEqually}
            getMemberTotalAmount={editor.getMemberTotalAmount}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerLoading: { justifyContent: 'center', alignItems: 'center' },
  headerSplit: { padding: spacing.lg },
  headerTitleSplit: { fontSize: 20 },
  headerRight: { minWidth: 100, alignItems: 'flex-end' },
  mainLayout: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },
  imagePane: { height: '100%', minHeight: 300 },
  imageBox: {
    flex: 1,
    minHeight: undefined,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  receiptImage: { width: '100%', height: '100%' },
  noImageText: { color: colors.text.muted },
  editorPane: {
    flex: 1,
    minHeight: undefined,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  editorToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  storeName: { fontSize: 18, fontWeight: 'bold', color: colors.text.main },
});
