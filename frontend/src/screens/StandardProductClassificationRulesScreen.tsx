import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBackButton, AppButton, AppFormField, AppSelect, AppTextInput } from '../components/ui';
import { useStandardProductClassificationRules } from '../features/admin';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { colors } from '../theme/colors';

export function StandardProductClassificationRulesScreen({ onBack }: { onBack: () => void }) {
  const rules = useStandardProductClassificationRules();
  return <View style={[screenLayout.container, styles.container]}>
    <View style={[screenLayout.header, styles.header]}><AppBackButton onPress={onBack} /><Text style={screenLayout.headerTitle}>標準分類ルール</Text><View style={styles.spacer} /></View>
    <ScrollView contentContainerStyle={screenLayout.scrollContent}>
      <View style={cardStyles.section}>
        <Text style={styles.help}>変更は新規分類へ直ちに反映されます。既存明細は「既存明細の再分類」を明示実行した場合だけ更新されます。</Text>
        <AppFormField label="キーワード"><AppTextInput value={rules.keyword} onChangeText={rules.setKeyword} placeholder="例: 麦茶（1文字語は登録不可）" /></AppFormField>
        <AppFormField label="商品種別"><AppSelect selectedValue={rules.productTypeId} onValueChange={rules.setProductTypeId} options={rules.productTypeOptions} /></AppFormField>
        <AppFormField label="優先度（小さいほど優先）"><AppTextInput value={rules.priority} onChangeText={rules.setPriority} keyboardType="number-pad" /></AppFormField>
        <AppFormField label="変更理由"><AppTextInput value={rules.reason} onChangeText={rules.setReason} placeholder="例: 実レシートで確認" /></AppFormField>
        <AppButton title="自世帯でプレビュー" variant="secondary" fullWidth onPress={() => void rules.preview()} />
        {rules.previewText ? <Text style={styles.preview}>{rules.previewText}</Text> : null}
        <AppButton title={rules.editingId ? '標準ルールを更新' : '標準ルールを登録'} fullWidth onPress={() => void rules.create()} />
      </View>
      <View style={cardStyles.section}>
        <Text style={styles.title}>登録済みルール</Text>
        {rules.rules.map((rule) => <View key={rule.id} style={styles.row}>
          <View style={styles.rowText}><Text style={styles.keyword}>{rule.keyword} → {rule.productType.name}</Text><Text style={styles.meta}>優先度 {rule.priority} / {rule.isActive ? '有効' : '無効'} / {rule.lastChangeReason}</Text></View>
          {rule.isActive ? <View style={styles.actions}><AppButton title="編集" size="sm" variant="secondary" onPress={() => rules.beginEdit(rule)} /><AppButton title="無効化" size="sm" variant="secondary" onPress={() => void rules.deactivate(rule.id)} /></View> : null}
        </View>)}
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ container: { backgroundColor: colors.semantic.admin.background }, header: { backgroundColor: colors.semantic.admin.surface, borderBottomColor: colors.semantic.admin.border }, spacer: { width: 40 }, help: { color: colors.text.muted, lineHeight: 20, marginBottom: 12 }, preview: { color: colors.text.main, marginVertical: 10 }, title: { color: colors.text.main, fontWeight: 'bold', marginBottom: 8 }, row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10, gap: 8 }, rowText: { flex: 1 }, actions: { gap: 4 }, keyword: { color: colors.text.main, fontWeight: '600' }, meta: { color: colors.text.muted, marginTop: 3, fontSize: 12 } });
