import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBackButton, AppButton, AppFormField, AppTextInput } from '../components/ui';
import { useProductClassificationReclassification } from '../features/admin';
import { showConfirmDialog } from '../utils/confirmDialog';
import { colors } from '../theme/colors';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { spacing } from '../theme/spacing';

type Props = { onBack: () => void };

const statusLabels = {
  unclassified: '未分類',
  needs_review: '要確認',
} as const;

export function ProductClassificationReclassificationScreen({ onBack }: Props) {
  const reclassification = useProductClassificationReclassification();

  const confirmRun = () => {
    showConfirmDialog(
      '既存明細を再分類',
      '対象の未分類・要確認明細を現在の辞書で再評価します。手動確定済み明細は変更しません。実行結果は監査ログに保存されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '再分類を実行', style: 'destructive', onPress: () => void reclassification.run() },
      ]
    );
  };

  return (
    <View style={[screenLayout.container, styles.container]}>
      <View style={[screenLayout.header, styles.header]}>
        <AppBackButton onPress={onBack} />
        <Text style={screenLayout.headerTitle}>既存明細の再分類</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={[screenLayout.scrollContent, styles.content]}>
        <View style={[cardStyles.listCard, styles.notice]}>
          <Text style={styles.noticeTitle}>管理者向け操作</Text>
          <Text style={styles.noticeText}>標準辞書・世帯辞書の最新内容で、未分類または要確認の既存明細を再評価します。手動確定済み明細は対象外です。</Text>
        </View>

        <View style={cardStyles.section}>
          <Text style={styles.label}>対象状態</Text>
          <View style={styles.statusButtons}>
            {(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => (
              <AppButton
                key={status}
                title={`${reclassification.statuses.includes(status) ? '✓ ' : ''}${statusLabels[status]}`}
                variant={reclassification.statuses.includes(status) ? 'primary' : 'secondary'}
                onPress={() => reclassification.toggleStatus(status)}
                style={styles.statusButton}
              />
            ))}
          </View>
          <AppFormField label="開始日（任意、YYYY-MM-DD）">
            <AppTextInput value={reclassification.startDate} onChangeText={reclassification.setStartDate} placeholder="例: 2026-08-01" autoCapitalize="none" />
          </AppFormField>
          <AppFormField label="終了日（任意、指定日の翌日以降を除外）">
            <AppTextInput value={reclassification.endDate} onChangeText={reclassification.setEndDate} placeholder="例: 2026-09-01" autoCapitalize="none" />
          </AppFormField>
          <AppFormField label="最大件数（1〜500）" error={reclassification.validationError ?? undefined}>
            <AppTextInput value={reclassification.limit} onChangeText={reclassification.setLimit} keyboardType="number-pad" />
          </AppFormField>
          <AppButton title="再分類を実行" variant="dangerFilled" fullWidth loading={reclassification.running} onPress={confirmRun} />
        </View>

        {reclassification.result ? <ResultView result={reclassification.result} /> : null}
      </ScrollView>
    </View>
  );
}

function ResultView({ result }: { result: ReturnType<typeof useProductClassificationReclassification>['result'] }) {
  if (!result) return null;
  return (
    <View style={cardStyles.section}>
      <Text style={styles.resultTitle}>実行結果 #{result.id}</Text>
      <Text style={styles.resultStatus}>{result.status === 'completed' ? '完了' : '一部失敗'}</Text>
      <View style={styles.counts}>
        <Text style={styles.count}>対象 {result.selectedCount}件</Text>
        <Text style={styles.count}>更新 {result.updatedCount}件</Text>
        <Text style={styles.count}>変更なし {result.unchangedCount}件</Text>
        <Text style={styles.count}>失敗 {result.failedCount}件</Text>
      </View>
      {result.itemAudits.length > 0 ? (
        <View style={styles.auditList}>
          <Text style={styles.auditHeading}>更新・失敗の監査記録</Text>
          {result.itemAudits.map((audit) => (
            <Text key={`${audit.itemId}-${audit.createdAt}`} style={styles.auditRow}>
              明細 #{audit.itemId}：{audit.outcome === 'updated' ? '更新' : '失敗'}
              {audit.errorMessage ? `（${audit.errorMessage}）` : ''}
            </Text>
          ))}
        </View>
      ) : <Text style={styles.emptyAudit}>更新・失敗はありませんでした。</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.semantic.admin.background },
  header: { backgroundColor: colors.semantic.admin.surface, borderBottomColor: colors.semantic.admin.border },
  headerSpacer: { width: 40 },
  content: { paddingBottom: 40 },
  notice: { backgroundColor: colors.semantic.warning.bg, borderColor: colors.semantic.warning.border, marginBottom: spacing.lg },
  noticeTitle: { color: colors.semantic.warning.text, fontWeight: 'bold', marginBottom: spacing.xs },
  noticeText: { color: colors.text.main, lineHeight: 20 },
  label: { color: colors.text.main, fontSize: 13, fontWeight: '600', marginBottom: spacing.xs },
  statusButtons: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statusButton: { flex: 1 },
  resultTitle: { color: colors.text.main, fontSize: 17, fontWeight: 'bold' },
  resultStatus: { color: colors.semantic.admin.success, fontWeight: 'bold', marginTop: spacing.xs },
  counts: { marginTop: spacing.sm, gap: spacing.xs },
  count: { color: colors.text.main },
  auditList: { marginTop: spacing.md, gap: spacing.xs },
  auditHeading: { color: colors.text.main, fontWeight: 'bold' },
  auditRow: { color: colors.text.muted },
  emptyAudit: { color: colors.text.muted, marginTop: spacing.md },
});
