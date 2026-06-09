import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  ScrollView, 
  useWindowDimensions, 
  Alert 
} from 'react-native';
import { AppButton, AppSelect, AppTextInput } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { theme, BREAKPOINTS } from '../theme';
import apiClient from '../utils/apiClient';
import { useReceiptImageSource } from '../utils/receiptImageSource';

interface ReceiptDetailComponentProps {
  receipt: any;
  categories: any[];
  onCategoryChange: (itemId: number, categoryId: number | null) => void;
  baseUrl: string;
  fullWidth?: boolean; 
  onSaveSuccess?: () => void;
  onGoToSplitEditor?: (receipt: any) => void; // ★ [Issue #79] 按分エディタへの遷移
}

/**
 * [Issue #67 / #71 / #79 / #81] レシート詳細表示・編集コンポーネント
 */
export const ReceiptDetailComponent: React.FC<ReceiptDetailComponentProps> = ({
  receipt,
  categories,
  onCategoryChange,
  baseUrl,
  fullWidth = true,
  onSaveSuccess,
  onGoToSplitEditor
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const effectiveWidth = fullWidth ? windowWidth : windowWidth - 350;
  const isWide = effectiveWidth >= BREAKPOINTS.TABLET;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const cacheKey = useMemo(() => Date.now(), []);
  const imageSource = useReceiptImageSource(receipt?.imagePath);
  const imageSourceWithCache = useMemo(() => {
    if (!imageSource) return null;
    if (!imageSource.uri.startsWith('http')) return imageSource;
    return { ...imageSource, uri: `${imageSource.uri}?v=${cacheKey}` };
  }, [imageSource, cacheKey]);

  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id as number })),
    [categories]
  );

  useEffect(() => {
    if (receipt) {
      const data = JSON.parse(JSON.stringify(receipt));
      data.taxAmount = data.taxAmount ?? 0;
      setEditData(data);
    }
    setIsEditing(false);
  }, [receipt]);

  const displayTotal = useMemo(() => {
    if (!editData) return 0;
    const items = isEditing ? editData.items : receipt.items;
    const tax = isEditing ? parseFloat(String(editData.taxAmount)) || 0 : receipt.taxAmount || 0;

    const itemsSum = items.reduce((s: number, i: any) => {
      const p = parseFloat(String(i.price)) || 0;
      const q = parseFloat(String(i.quantity)) || 0;
      return s + (p * q);
    }, 0);

    return Math.round(itemsSum + tax); 
  }, [isEditing, editData?.items, editData?.taxAmount, receipt.items, receipt.taxAmount]);

  if (!receipt || !editData) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.emptyText}>レシートを選択してください</Text>
      </View>
    );
  }

  const updateEditField = (key: string, value: any) => {
    setEditData({ ...editData, [key]: value });
  };

  const updateEditItem = (index: number, key: string, value: any) => {
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setEditData({ ...editData, items: newItems });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        storeName: editData.storeName,
        date: editData.date,
        taxAmount: parseFloat(String(editData.taxAmount)) || 0,
        totalAmount: displayTotal, 
        items: editData.items.map((item: any) => ({
          ...item,
          price: parseFloat(String(item.price)) || 0,
          quantity: parseFloat(String(item.quantity)) || 0,
          categoryId: item.categoryId ? Number(item.categoryId) : null
        }))
      };

      const res = await apiClient.patch(`/receipts/${receipt.id}`, payload);
      if (res.data?.success) {
        Alert.alert('成功', '変更を保存しました。');
        setIsEditing(false);
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (err: any) {
      console.error('Update failed', err.response?.data || err.message);
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const DetailContent = (
    <View style={isWide ? styles.wideContentWrapper : styles.mobileContentWrapper}>
      
      {/* 左側：画像エリア */}
      <View style={isWide ? styles.wideImageColumn : styles.mobileImageArea}>
        <View style={[styles.imageWrapper, !isWide && { height: 350 }]}>
          {receipt.imagePath && imageSourceWithCache ? (
            <Image 
              source={imageSourceWithCache}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Text style={styles.emptyText}>画像なし</Text>
            </View>
          )}
        </View>
      </View>

      {/* 右側：情報エリア */}
      <View style={isWide ? styles.wideInfoColumn : styles.mobileInfoArea}>
        <View style={styles.editControls}>
          {isEditing ? (
            <>
              <AppButton
                title={BUTTON_LABELS.cancel}
                onPress={() => setIsEditing(false)}
                variant="secondary"
                size="sm"
              />
              <AppButton
                title={BUTTON_LABELS.save}
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                size="sm"
              />
            </>
          ) : (
            <>
              {/* ★ [Issue #81] スマホ非表示化 ＆ 文言変更 */}
              {onGoToSplitEditor && isWide && (
                <AppButton
                  title="➗ 割り勘"
                  onPress={() => onGoToSplitEditor(receipt)}
                  variant="outline"
                  size="sm"
                  style={styles.splitButtonOverride}
                />
              )}
              <AppButton
                title={`✎ ${BUTTON_LABELS.edit}`}
                onPress={() => setIsEditing(true)}
                variant="secondary"
                size="sm"
              />
            </>
          )}
        </View>

        <View style={styles.detailHeaderInner}>
          {isEditing ? (
            <AppTextInput
              style={styles.titleInput}
              inputStyle={styles.titleInputText}
              value={editData.storeName}
              onChangeText={(val) => updateEditField('storeName', val)}
              placeholder="店舗名"
            />
          ) : (
            <Text style={styles.detailTitle} selectable={true}>{receipt.storeName || '店名不明'}</Text>
          )}
          
          {isEditing ? (
            <AppTextInput
              style={styles.dateInput}
              value={editData.date ? new Date(editData.date).toISOString().replace('T', ' ').substring(0, 16) : ''}
              onChangeText={(val) => updateEditField('date', val)}
              placeholder="YYYY-MM-DD HH:mm"
            />
          ) : (
            <Text style={styles.detailDate}>
              {receipt.date ? new Date(receipt.date).toLocaleString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
              }) : '日付不明'}
            </Text>
          )}
        </View>

        <View style={styles.detailTotalContainer}>
          <Text style={styles.detailTotalLabel}>最終支払額（税込）</Text>
          <Text style={styles.detailTotalValue}>
            ¥{displayTotal.toLocaleString()}
          </Text>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
          {(isEditing ? editData.items : receipt.items)?.map((item: any, idx: number) => (
            <View key={item.id || idx} style={styles.detailItemRow}>
              <View style={styles.detailItemTop}>
                {isEditing ? (
                  <AppTextInput
                    style={styles.itemNameInput}
                    value={item.name}
                    onChangeText={(val) => updateEditItem(idx, 'name', val)}
                  />
                ) : (
                  <Text style={styles.detailItemName}>{item.name}</Text>
                )}
                
                <View style={styles.detailPriceContainer}>
                  {isEditing ? (
                    <View style={styles.editPriceRow}>
                      <Text style={styles.currencySymbol}>¥</Text>
                      <AppTextInput
                        style={styles.priceInput}
                        value={String(item.price)}
                        keyboardType="decimal-pad"
                        onChangeText={(val) => updateEditItem(idx, 'price', val)}
                      />
                      <Text style={styles.multiplier}>×</Text>
                      <AppTextInput
                        style={styles.quantityInput}
                        value={String(item.quantity)}
                        keyboardType="decimal-pad"
                        onChangeText={(val) => updateEditItem(idx, 'quantity', val)}
                      />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.detailItemPrice}>
                        ¥{Math.round((parseFloat(String(item.price)) || 0) * (parseFloat(String(item.quantity)) || 0)).toLocaleString()}
                      </Text>
                      <Text style={styles.detailItemSub}>
                        （¥{(parseFloat(String(item.price)) || 0).toLocaleString()} × {String(parseFloat(String(item.quantity || 0)))}）
                      </Text>
                    </>
                  )}
                </View>
              </View>
              
              <View style={styles.detailItemBottom}>
                <AppSelect<number | null>
                  selectedValue={item.categoryId ?? null}
                  onValueChange={(val) =>
                    isEditing ? updateEditItem(idx, 'categoryId', val) : onCategoryChange(item.id, val)
                  }
                  options={categorySelectOptions}
                  placeholder="カテゴリーを選択..."
                  style={styles.categorySelect}
                />
              </View>
            </View>
          ))}

          <View style={styles.taxSection}>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>消費税 (外税・加算額)</Text>
              {isEditing ? (
                <View style={styles.editTaxRow}>
                  <Text style={styles.currencySymbol}>+ ¥</Text>
                  <AppTextInput
                    style={styles.taxInput}
                    value={String(editData.taxAmount)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) => updateEditField('taxAmount', val)}
                  />
                </View>
              ) : (
                <Text style={styles.taxValue}>+ ¥{(receipt.taxAmount || 0).toLocaleString()}</Text>
              )}
            </View>
          </View>

        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {DetailContent}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
  detailScroll: { flex: 1 },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: theme.colors.text.muted },
  wideContentWrapper: { flexDirection: 'row', padding: 30, width: '100%', alignItems: 'flex-start' },
  mobileContentWrapper: { flexDirection: 'column', padding: 20 },
  wideImageColumn: { width: 400, marginRight: 40 }, 
  wideInfoColumn: { flex: 1 }, 
  mobileImageArea: { width: '100%', marginBottom: 25 },
  mobileInfoArea: { width: '100%' },
  imageWrapper: { width: '100%', height: 600, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  receiptImage: { width: '100%', height: '100%' },
  detailHeaderInner: { marginBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.main },
  titleInput: { marginBottom: 4 },
  titleInputText: { fontSize: 24, fontWeight: 'bold' },
  detailDate: { fontSize: 16, color: theme.colors.text.muted, marginTop: 4 },
  dateInput: { marginTop: 4 },
  detailTotalContainer: { alignItems: 'flex-end', marginBottom: 30, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTotalLabel: { fontSize: 13, color: theme.colors.text.muted },
  detailTotalValue: { fontSize: 38, fontWeight: 'bold', color: theme.colors.text.main },
  itemsSection: { marginBottom: 20 },
  itemsSectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary, marginBottom: 15, textTransform: 'uppercase' },
  detailItemRow: { flexDirection: 'column', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: sem.table.rowBorder },
  detailItemTop: { marginBottom: 10 },
  detailItemName: { fontSize: 17, fontWeight: '600', color: theme.colors.text.main, marginBottom: 4 },
  itemNameInput: { marginBottom: 4 },
  detailPriceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  detailItemPrice: { fontWeight: '700', color: theme.colors.primary, fontSize: 16 },
  detailItemSub: { fontSize: 12, color: theme.colors.text.muted, marginLeft: 6 },
  detailItemBottom: { width: '100%' },
  editControls: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, gap: 10 },
  splitButtonOverride: { backgroundColor: sem.info.bg, borderColor: sem.info.border },
  editPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceInput: { width: 100, minHeight: 40 },
  quantityInput: { width: 72, minHeight: 40 },
  currencySymbol: { fontSize: 14, color: theme.colors.text.muted },
  multiplier: { fontSize: 14, color: theme.colors.text.muted },
  categorySelect: { marginTop: 4 },
  taxSection: { marginTop: 20, paddingVertical: 15, borderTopWidth: 2, borderTopColor: sem.divider, borderStyle: 'dashed' },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxLabel: { fontSize: 14, color: theme.colors.text.muted, fontWeight: '600' },
  taxValue: { fontSize: 16, color: theme.colors.text.main, fontWeight: '700' },
  editTaxRow: { flexDirection: 'row', alignItems: 'center' },
  taxInput: { width: 120, minHeight: 40 },
});

export default ReceiptDetailComponent;