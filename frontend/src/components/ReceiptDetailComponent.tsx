import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
// Issue #66: BREAKPOINTS を追加インポート
import { theme, BREAKPOINTS } from '../theme';

interface ReceiptDetailComponentProps {
  receipt: any;
  categories: any[];
  onCategoryChange: (itemId: number, categoryId: number | null) => void;
  baseUrl: string;
  fullWidth?: boolean; 
}

/**
 * [Issue #49-8] レシート詳細表示コンポーネント
 * - 数量の小数点表示を強制 (Stringキャストの最適化)
 * - Android Picker の表示欠けを完全に解消
 * - [Issue #66] ブレイクポイントを統一定数に置換
 */
export const ReceiptDetailComponent: React.FC<ReceiptDetailComponentProps> = ({
  receipt,
  categories,
  onCategoryChange,
  baseUrl,
  fullWidth = true
}) => {
  const { width: windowWidth } = useWindowDimensions();
  
  const effectiveWidth = fullWidth ? windowWidth : windowWidth - 350;
  // Issue #66: ハードコード(700)を共通定数(768)に置換
  const isWide = effectiveWidth >= BREAKPOINTS.TABLET;

  const cacheKey = useMemo(() => Date.now(), []);

  if (!receipt) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.emptyText}>レシートを選択してください</Text>
      </View>
    );
  }

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    return `${baseUrl}/${imagePath}?v=${cacheKey}`;
  };

  const DetailContent = (
    <View style={isWide ? styles.wideContentWrapper : styles.mobileContentWrapper}>
      
      {/* 左側：画像エリア */}
      <View style={isWide ? styles.wideImageColumn : styles.mobileImageArea}>
        <View style={[styles.imageWrapper, !isWide && { height: 350 }]}>
          {receipt.imagePath ? (
            <Image 
              source={{ uri: getImageUrl(receipt.imagePath) as string }}
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
        <View style={styles.detailHeaderInner}>
          <Text style={styles.detailTitle} selectable={true}>
            {receipt.storeName || '店名不明'}
          </Text>
          <Text style={styles.detailDate}>
            {receipt.date ? new Date(receipt.date).toLocaleDateString('ja-JP') : '日付不明'}
          </Text>
        </View>

        <View style={styles.detailTotalContainer}>
          <Text style={styles.detailTotalLabel}>合計金額（税込）</Text>
          <Text style={styles.detailTotalValue}>¥{Math.round(receipt.totalAmount || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
          {receipt.items?.map((item: any) => (
            <View key={item.id} style={styles.detailItemRow}>
              <View style={styles.detailItemTop}>
                <Text style={styles.detailItemName}>{item.name}</Text>
                <View style={styles.detailPriceContainer}>
                  <Text style={styles.detailItemPrice}>
                    ¥{Math.round((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                  </Text>
                  {/* 数量: parseFloatで確実に実数として扱い、不要な整数化を避ける */}
                  <Text style={styles.detailItemSub}>
                    （¥{(item.price || 0).toLocaleString()} × {String(parseFloat(item.quantity || 0))}）
                  </Text>
                </View>
              </View>
              <View style={styles.detailItemBottom}>
                <View style={styles.detailPickerWrapper}>
                  <Picker
                    selectedValue={item.categoryId}
                    onValueChange={(val) => onCategoryChange(item.id, val)}
                    style={styles.detailPicker}
                    mode="dropdown"
                  >
                    <Picker.Item label="カテゴリーを選択..." value={null} color={theme.colors.text.muted} />
                    {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} color="#333" />)}
                  </Picker>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.detailScroll} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {DetailContent}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  detailScroll: { flex: 1 },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: theme.colors.text.muted },

  wideContentWrapper: { 
    flexDirection: 'row', 
    padding: 30, 
    width: '100%', 
    alignItems: 'flex-start' 
  },
  mobileContentWrapper: { flexDirection: 'column', padding: 20 },
  
  wideImageColumn: { width: 400, marginRight: 40 }, 
  wideInfoColumn: { flex: 1 }, 
  
  mobileImageArea: { width: '100%', marginBottom: 25 },
  mobileInfoArea: { width: '100%' },

  imageWrapper: { 
    width: '100%', 
    height: 600, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  receiptImage: { width: '100%', height: '100%' },

  detailHeaderInner: { marginBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.main },
  detailDate: { fontSize: 16, color: theme.colors.text.muted, marginTop: 4 },
  detailTotalContainer: { 
    alignItems: 'flex-end', 
    marginBottom: 30, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  detailTotalLabel: { fontSize: 13, color: theme.colors.text.muted },
  detailTotalValue: { fontSize: 38, fontWeight: 'bold', color: theme.colors.text.main },
  
  itemsSection: { marginBottom: 20 },
  itemsSectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary, marginBottom: 15, textTransform: 'uppercase' },
  
  detailItemRow: { 
    flexDirection: 'column', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  detailItemTop: { marginBottom: 10 },
  detailItemBottom: { width: '100%' },
  detailItemName: { fontSize: 17, fontWeight: '600', color: theme.colors.text.main, marginBottom: 4 },
  detailPriceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  detailItemPrice: { fontWeight: '700', color: theme.colors.primary, fontSize: 16 },
  detailItemSub: { fontSize: 12, color: theme.colors.text.muted, marginLeft: 6 },
  
  // Android Picker クリッピング修正: 高さを55pxに拡大し overflow: visible を適用
  detailPickerWrapper: { 
    height: 55, 
    backgroundColor: theme.colors.surface, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    overflow: 'visible',
    justifyContent: 'center',
    marginTop: 4
  },
  detailPicker: { 
    width: '100%',
    height: 55,
    color: '#333',
    ...Platform.select({
      android: {
        marginLeft: -10,
      },
      web: { outlineStyle: 'none' } as any
    })
  },
});