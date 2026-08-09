import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppBackButton, AppButton, AppModal, AppTextInput } from '../components/ui';
import {
  ProductClassificationLearningDataFilters,
  ProductClassificationLearningDataList,
  useProductClassificationLearningData,
} from '../features/productClassification';
import { colors } from '../theme/colors';
import { screenLayout } from '../theme/screenLayout';

type Props = { onBack: () => void };

export default function ProductClassificationLearningDataScreen({ onBack }: Props) {
  const learningData = useProductClassificationLearningData();
  return <View style={screenLayout.container}>
    <View style={screenLayout.header}><AppBackButton onPress={onBack} /><Text style={screenLayout.headerTitle}>分類学習データ</Text><View style={styles.spacer} /></View>
    <Text style={styles.description}>世帯辞書を確認・無効化できます。確定履歴と標準ルールは変更できません。</Text>
    <ProductClassificationLearningDataFilters value={learningData.type} onChange={learningData.setType} />
    {learningData.loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View> : <ProductClassificationLearningDataList records={learningData.records} deactivatingId={learningData.deactivatingId} onDeactivate={learningData.deactivate} />}
    <AppModal
      visible={Boolean(learningData.pendingRecord)}
      onRequestClose={learningData.closeDeactivateModal}
      title="学習データを無効化"
      description={learningData.pendingRecord ? `「${learningData.pendingRecord.normalizedName}」を無効化します。理由を記録してください。` : undefined}
      footer={<>
        <AppButton title="キャンセル" variant="secondary" onPress={learningData.closeDeactivateModal} disabled={Boolean(learningData.deactivatingId)} />
        <AppButton title="無効化" variant="dangerFilled" onPress={() => void learningData.confirmDeactivate()} loading={Boolean(learningData.deactivatingId)} disabled={!learningData.reason.trim()} />
      </>}
    >
      <AppTextInput value={learningData.reason} onChangeText={learningData.setReason} placeholder="例: 商品種別の対応付けが誤っているため" variant="textarea" autoCapitalize="sentences" />
    </AppModal>
  </View>;
}

const styles = StyleSheet.create({ spacer: { width: 40 }, description: { color: colors.text.muted, paddingHorizontal: 16, paddingBottom: 12 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
