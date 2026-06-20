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
import { theme } from '../theme';
import { useIsWideLayout } from '../hooks/useIsWideLayout';
import { useSplitEditor } from '../hooks/useSplitEditor';
import { SplitEditorMemberChips } from '../components/splitEditor/SplitEditorMemberChips';
import { SplitEditorItemTable } from '../components/splitEditor/SplitEditorItemTable';
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
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>割り勘エディタ</Text>
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
          <View style={styles.imageBox}>
            {imageSource ? (
              <Image source={imageSource} style={styles.receiptImage} resizeMode="contain" />
            ) : (
              <Text style={styles.noImageText}>画像がありません</Text>
            )}
          </View>
        </View>

        <View style={styles.editorPane}>
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.main },
  headerRight: { minWidth: 100, alignItems: 'flex-end' },
  mainLayout: { flex: 1, padding: 20, gap: 20 },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },
  imagePane: { height: '100%', minHeight: 300 },
  imageBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  receiptImage: { width: '100%', height: '100%' },
  noImageText: { color: theme.colors.text.muted },
  editorPane: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  editorToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  storeName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
});
