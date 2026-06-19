import React, { useState, useMemo } from 'react';
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
import { receiptApi } from '../api/receiptApi';
import { AppBackButton, AppButton, AppFormField, AppSelect, AppTextInput } from '../components/ui';
import { modalStyles } from '../theme';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { theme } from '../theme';
import { useReceiptImageSource } from '../utils/receiptImageSource';
import { showAlert } from '../utils/alertMessage';
import type { ReceiptScanInitialData } from '../types/receiptScan';
import type { ParsedReceiptItemInput } from '../types/receipt';

const c = theme.colors;
const s = theme.colors.semantic.scan;

interface ReceiptScanScreenProps {
  initialData: ReceiptScanInitialData;
  categories: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * [Issue #67 / #71 / #63] レシート解析結果の確認・編集画面
 * - 外税(taxAmount)の編集・合算に対応
 * - 単価・数量の小数点入力対応
 * - 解析コスト紐付け用 usageLogId のポストに対応
 */
export const ReceiptScanScreen: React.FC<ReceiptScanScreenProps> = ({
  initialData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  // 初期値に taxAmount がない場合へのフォールバック
  const [receiptData, setReceiptData] = useState({
    ...initialData.parsedData,
    taxAmount: initialData.parsedData.taxAmount ?? '0',
  });

  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories]
  );

  const imageSource = useReceiptImageSource(initialData.imagePath);

  // 合計金額の計算（明細合計 + 外税）
  const calculatedTotal = useMemo(() => {
    const itemsTotal = receiptData.items.reduce((sum, item) => {
      const p = parseFloat(String(item.price)) || 0;
      const q = parseFloat(String(item.quantity)) || 0;
      return sum + (p * q);
    }, 0);
    
    const tax = parseFloat(String(receiptData.taxAmount)) || 0;
    // 日本円のため最終的な支払額は四捨五入して整数化
    return Math.round(itemsTotal + tax);
  }, [receiptData.items, receiptData.taxAmount]);

  const updateItem = (index: number, key: keyof ParsedReceiptItemInput, value: ParsedReceiptItemInput[keyof ParsedReceiptItemInput]) => {
    const newItems = [...receiptData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setReceiptData({ ...receiptData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = receiptData.items.filter((_, i) => i !== index);
    setReceiptData({ ...receiptData, items: newItems });
  };

  const addItem = () => {
    const newItems = [...receiptData.items, { name: '', price: 0, quantity: 1, categoryId: null }];
    setReceiptData({ ...receiptData, items: newItems });
  };

  const handleCommit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        jobId: initialData.jobId,
        parsedData: { 
          ...receiptData, 
          totalAmount: calculatedTotal,
          taxAmount: parseFloat(String(receiptData.taxAmount)) || 0,
          items: receiptData.items.map(item => ({
            ...item,
            price: parseFloat(String(item.price)) || 0,
            quantity: parseFloat(String(item.quantity)) || 0,
            categoryId: item.categoryId ? Number(item.categoryId) : null
          }))
        },
        imagePath: initialData.imagePath,
        validation: initialData.validation
      };
      
      const res = await receiptApi.commitReceipt(payload);
      if (res.success) {
        showAlert('成功', 'レシートを保存しました。', { onOk: onSuccess });
        return;
      }
    } catch (err: any) {
      const apiError = err.response?.data;
      const message = apiError?.message || err.message;

      if (message === 'DUPLICATE') {
        const duplicateMessage = initialData.warnedDuplicateFromTray
          ? '確認トレイで重複の疑いが表示されていました。同じ内容のレシートは保存できません。トレイから破棄するか、履歴で既存レシートを確認してください。'
          : '同じ店名・日付・金額のレシートが世帯内に存在します。履歴画面で確認してください。';
        showAlert('既に登録済みです', duplicateMessage, { onOk: onCancel });
        return;
      }

      console.error('Commit error:', apiError || err.message);
      showAlert('エラー', message || '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <AppBackButton onPress={onCancel} style={styles.headerBack} />
          <Text style={styles.headerTitle}>解析結果の確認</Text>
          <AppButton
            title={BUTTON_LABELS.save}
            onPress={handleCommit}
            loading={loading}
            disabled={loading}
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

          {imageSource && (
            <View style={styles.imageContainer}>
              <Image source={imageSource} style={styles.receiptImage} resizeMode="contain" />
              <View style={styles.imageLabel}><Text style={styles.imageLabelText}>加工済みプレビュー</Text></View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>基本情報</Text>
            <AppFormField label="店舗名">
              <AppTextInput
                value={receiptData.storeName}
                onChangeText={(val) => setReceiptData({ ...receiptData, storeName: val })}
                placeholder="店舗名"
              />
            </AppFormField>
            <AppFormField label="購入日時">
              <AppTextInput
                value={receiptData.purchaseDate}
                onChangeText={(val) => setReceiptData({ ...receiptData, purchaseDate: val })}
                placeholder="YYYY-MM-DD HH:mm"
              />
            </AppFormField>

            <AppFormField label="消費税 (外税・加算額)">
              <View style={modalStyles.inputWithUnit}>
                <AppTextInput
                  variant="inline"
                  value={String(receiptData.taxAmount)}
                  keyboardType="decimal-pad"
                  onChangeText={(val) => setReceiptData({ ...receiptData, taxAmount: val })}
                />
                <Text style={modalStyles.unitSuffix}>円</Text>
              </View>
            </AppFormField>

            <View style={styles.totalDisplay}>
              <Text style={styles.totalLabel}>支払合計 (税込)</Text>
              <Text style={styles.totalValue}>¥ {calculatedTotal.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.itemsHeader}>
            <Text style={styles.sectionLabel}>商品明細 ({receiptData.items.length})</Text>
            <AppButton
              title={`+ ${BUTTON_LABELS.add}`}
              onPress={addItem}
              variant="outline"
              size="sm"
            />
          </View>

          {receiptData.items.map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <AppTextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(val) => updateItem(idx, 'name', val)}
                  placeholder="商品名"
                />
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.itemDetailRow}>
                <View style={styles.itemSubGroup}>
                  <Text style={styles.subLabel}>単価 (¥)</Text>
                  <AppTextInput
                    value={String(item.price)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) => updateItem(idx, 'price', val)}
                  />
                </View>
                <View style={[styles.itemSubGroup, { flex: 0.6 }]}>
                  <Text style={styles.subLabel}>数量</Text>
                  <AppTextInput
                    value={String(item.quantity)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) => updateItem(idx, 'quantity', val)}
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
                  onValueChange={(val) => updateItem(idx, 'categoryId', val)}
                  options={categorySelectOptions}
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
  container: { flex: 1, backgroundColor: s.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: s.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: s.textTitle },
  headerBack: { minWidth: 50 },
  duplicateBanner: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.semantic.warning.bg,
    borderWidth: 1,
    borderColor: theme.colors.semantic.warning.border,
  },
  duplicateBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.semantic.warning.text,
    marginBottom: 4,
  },
  duplicateBannerText: {
    fontSize: 13,
    color: theme.colors.semantic.warning.text,
    lineHeight: 20,
  },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: 260, backgroundColor: s.imageBg, marginBottom: theme.spacing.md, position: 'relative' },
  receiptImage: { width: '100%', height: '100%' },
  imageLabel: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  imageLabelText: { color: c.text.inverse, fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: c.surface, margin: theme.spacing.md, marginTop: 0, borderRadius: theme.spacing.md, padding: theme.spacing.md, elevation: 2 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: s.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  totalDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: s.borderInput },
  totalLabel: { fontSize: 14, color: s.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: c.primary },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: theme.spacing.md, marginBottom: 12 },
  itemCard: { backgroundColor: c.surface, marginHorizontal: theme.spacing.md, marginBottom: 12, borderRadius: theme.spacing.md, padding: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: c.primary, elevation: 1 },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemNameInput: { flex: 1, marginRight: 8 },
  deleteIcon: { fontSize: 18, color: s.deleteIcon },
  itemDetailRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  itemSubGroup: { flex: 1 },
  subLabel: { fontSize: 10, color: s.textMuted, fontWeight: 'bold', marginBottom: 4 },
  subTotalText: { fontSize: 14, fontWeight: '700', color: s.textItem, paddingTop: 4 },
});