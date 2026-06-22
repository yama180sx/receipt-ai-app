import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton, AppButton, AppFormField, AppSelect, AppTextInput } from '../components/ui';
import { useReceiptScan } from '../features/receipt';
import { modalStyles } from '../theme/modalStyles';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borderRadius } from '../theme/radii';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import type { ReceiptScanInitialData } from '../types/receiptScan';

const c = colors;
const s = colors.semantic.scan;

interface ReceiptScanScreenProps {
  initialData: ReceiptScanInitialData;
  categories: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * [Issue #67 / #71 / #100-14] レシート解析結果の確認・編集画面 — Hook + UI
 */
export const ReceiptScanScreen: React.FC<ReceiptScanScreenProps> = ({
  initialData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const scan = useReceiptScan({ initialData, categories, onSuccess, onCancel });

  return (
    <SafeAreaView style={[screenLayout.container, styles.containerScan]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[screenLayout.header, styles.headerScan]}>
          <AppBackButton onPress={onCancel} style={styles.headerBack} />
          <Text style={[screenLayout.headerTitle, styles.headerTitleScan]}>解析結果の確認</Text>
          <AppButton
            title={BUTTON_LABELS.save}
            onPress={scan.handleCommit}
            loading={scan.loading}
            disabled={scan.loading}
            size="sm"
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {initialData.duplicateSuspected ? (
            <View style={styles.duplicateBanner}>
              <Text style={styles.duplicateBannerTitle}>重複の疑い</Text>
              <Text style={styles.duplicateBannerText}>
                同じ店名・日付・金額のレシートが登録済みの可能性があります。
                {initialData.existingReceiptId
                  ? `（既存レシート ID: ${initialData.existingReceiptId}）`
                  : ''}
                {' '}内容を確認のうえ、問題なければ保存できます。
              </Text>
            </View>
          ) : null}

          {scan.imageSource && (
            <View style={styles.imageContainer}>
              <Image source={scan.imageSource} style={styles.receiptImage} resizeMode="contain" />
              <View style={styles.imageLabel}><Text style={styles.imageLabelText}>加工済みプレビュー</Text></View>
            </View>
          )}

          <View style={[cardStyles.chartCard, styles.card]}>
            <Text style={styles.sectionLabel}>基本情報</Text>
            <AppFormField label="店舗名">
              <AppTextInput
                value={scan.receiptData.storeName}
                onChangeText={(val) => scan.setReceiptData({ ...scan.receiptData, storeName: val })}
                placeholder="店舗名"
              />
            </AppFormField>
            <AppFormField label="購入日時">
              <AppTextInput
                value={scan.receiptData.purchaseDate}
                onChangeText={(val) => scan.setReceiptData({ ...scan.receiptData, purchaseDate: val })}
                placeholder="YYYY-MM-DD HH:mm"
              />
            </AppFormField>

            <AppFormField label="消費税 (外税・加算額)">
              <View style={modalStyles.inputWithUnit}>
                <AppTextInput
                  variant="inline"
                  value={String(scan.receiptData.taxAmount)}
                  keyboardType="decimal-pad"
                  onChangeText={(val) => scan.setReceiptData({ ...scan.receiptData, taxAmount: val })}
                />
                <Text style={modalStyles.unitSuffix}>円</Text>
              </View>
            </AppFormField>

            <View style={styles.totalDisplay}>
              <Text style={styles.totalLabel}>支払合計 (税込)</Text>
              <Text style={styles.totalValue}>¥ {scan.calculatedTotal.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.itemsHeader}>
            <Text style={styles.sectionLabel}>商品明細 ({scan.receiptData.items.length})</Text>
            <AppButton
              title={`+ ${BUTTON_LABELS.add}`}
              onPress={scan.addItem}
              variant="outline"
              size="sm"
            />
          </View>

          {scan.receiptData.items.map((item, idx) => (
            <View key={idx} style={[cardStyles.chartCard, styles.itemCard]}>
              <View style={styles.itemHeaderRow}>
                <AppTextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(val) => scan.updateItem(idx, 'name', val)}
                  placeholder="商品名"
                />
                <TouchableOpacity onPress={() => scan.removeItem(idx)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemDetailRow}>
                <View style={styles.itemSubGroup}>
                  <Text style={styles.subLabel}>単価 (¥)</Text>
                  <AppTextInput
                    value={String(item.price)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) => scan.updateItem(idx, 'price', val)}
                  />
                </View>
                <View style={[styles.itemSubGroup, { flex: 0.6 }]}>
                  <Text style={styles.subLabel}>数量</Text>
                  <AppTextInput
                    value={String(item.quantity)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) => scan.updateItem(idx, 'quantity', val)}
                  />
                </View>
                <View style={[styles.itemSubGroup, { alignItems: 'flex-end' }]}>
                  <Text style={styles.subLabel}>小計</Text>
                  <Text style={styles.subTotalText}>
                    ¥ {Math.round((parseFloat(String(item.price)) || 0) * (parseFloat(String(item.quantity)) || 0)).toLocaleString()}
                  </Text>
                </View>
              </View>

              <AppFormField label="カテゴリ">
                <AppSelect<number | null>
                  selectedValue={item.categoryId}
                  onValueChange={(val) => scan.updateItem(idx, 'categoryId', val)}
                  options={scan.categorySelectOptions}
                  placeholder="未選択"
                />
              </AppFormField>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  containerScan: { backgroundColor: s.background },
  headerScan: { backgroundColor: c.surface, borderBottomColor: s.borderLight },
  headerTitleScan: { fontSize: 17, color: s.textTitle },
  headerBack: { minWidth: 50 },
  duplicateBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.semantic.warning.bg,
    borderWidth: 1,
    borderColor: colors.semantic.warning.border,
  },
  duplicateBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.semantic.warning.text,
    marginBottom: 4,
  },
  duplicateBannerText: {
    fontSize: 13,
    color: colors.semantic.warning.text,
    lineHeight: 20,
  },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: 260, backgroundColor: s.imageBg, marginBottom: spacing.md, position: 'relative' },
  receiptImage: { width: '100%', height: '100%' },
  imageLabel: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm },
  imageLabelText: { color: c.text.inverse, fontSize: 10, fontWeight: 'bold' },
  card: { minHeight: undefined, alignItems: 'stretch', margin: spacing.md, marginTop: 0, elevation: 2 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: s.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  totalDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: s.borderInput },
  totalLabel: { fontSize: 14, color: s.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: c.primary },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: 12 },
  itemCard: {
    minHeight: undefined,
    alignItems: 'stretch',
    marginHorizontal: spacing.md,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: c.primary,
    elevation: 1,
  },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemNameInput: { flex: 1, marginRight: 8 },
  deleteIcon: { fontSize: 18, color: s.deleteIcon },
  itemDetailRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  itemSubGroup: { flex: 1 },
  subLabel: { fontSize: 10, color: s.textMuted, fontWeight: 'bold', marginBottom: 4 },
  subTotalText: { fontSize: 14, fontWeight: '700', color: s.textItem, paddingTop: 4 },
});
