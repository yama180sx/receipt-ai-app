import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/ui';
import type { ProductClassificationLearningData } from '../../../api/generated';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = { records: ProductClassificationLearningData[]; deactivatingId: number | null; onDeactivate: (record: ProductClassificationLearningData) => void };
const typeLabels = { household_dictionary: '世帯辞書', alias: '別名', history: '確定履歴' } as const;

export const ProductClassificationLearningDataList: React.FC<Props> = ({ records, deactivatingId, onDeactivate }) => <FlatList
  data={records} keyExtractor={(record) => `${record.type}-${record.id}`} contentContainerStyle={records.length ? styles.list : styles.emptyList}
  ListEmptyComponent={<Text style={styles.empty}>該当する学習データはありません</Text>}
  renderItem={({ item }) => <View style={styles.card}>
    <View style={styles.head}><Text style={styles.name}>{item.normalizedName}</Text><Text style={styles.type}>{typeLabels[item.type]}</Text></View>
    <Text style={styles.productType}>{item.productType.name}</Text>
    <Text style={styles.meta}>{item.type === 'history' ? '参照専用（確定履歴）' : item.isActive ? '有効' : '無効'}</Text>
    <Text style={styles.date}>更新: {new Date(item.updatedAt).toLocaleDateString('ja-JP')}</Text>
    {item.lastDeactivationAudit ? <View style={styles.audit}>
      <Text style={styles.auditTitle}>無効化理由: {item.lastDeactivationAudit.reason}</Text>
      <Text style={styles.auditMeta}>対象世帯: {item.lastDeactivationAudit.familyGroupName}・操作: {item.lastDeactivationAudit.actorMemberName ?? '不明'}・{new Date(item.lastDeactivationAudit.createdAt).toLocaleDateString('ja-JP')}</Text>
    </View> : null}
    {item.type !== 'history' && item.isActive ? <AppButton title="無効化" variant="danger" size="sm" loading={deactivatingId === item.id} onPress={() => onDeactivate(item)} style={styles.button} /> : null}
  </View>}
/>;

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm }, emptyList: { flexGrow: 1, justifyContent: 'center' }, empty: { textAlign: 'center', color: colors.text.muted },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, name: { flex: 1, color: colors.text.main, fontSize: 16, fontWeight: '700' },
  type: { color: colors.primary, fontSize: 12, fontWeight: '600' }, productType: { color: colors.text.main, marginTop: spacing.xs }, meta: { color: colors.text.muted, marginTop: spacing.xs, fontSize: 12 },
  date: { color: colors.text.muted, marginTop: 2, fontSize: 12 }, button: { alignSelf: 'flex-start', marginTop: spacing.sm },
  audit: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }, auditTitle: { color: colors.text.main, fontSize: 12 }, auditMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
});
