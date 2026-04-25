import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../theme';

interface ReceiptDetailComponentProps {
  receipt: any;
  categories: any[];
  onCategoryChange: (itemId: number, categoryId: number | null) => void;
  baseUrl: string;
  fullWidth?: boolean; // App.tsx 外枠の制限が解除されているかどうか
}

/**
 * レシート詳細表示コンポーネント
 * 画面幅に応じて、1カラム(モバイル)と2カラム(Web/iPad)を自動で切り替えます。
 */
export const ReceiptDetailComponent: React.FC<ReceiptDetailComponentProps> = ({
  receipt,
  categories,
  onCategoryChange,
  baseUrl,
  fullWidth = true
}) => {
  const { width: windowWidth } = useWindowDimensions();
  
  // 外側の有効幅を計算。
  // fullWidthがtrue（モーダル）なら画面全体、false（履歴画面）ならリスト分(350px)を差し引く。
  const effectiveWidth = fullWidth ? windowWidth : windowWidth - 350;
  
  // 有効幅が 700px 以上確保できるなら横並び(2カラム)にする
  const isWide = effectiveWidth > 700;

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
      
      {/* --- 左側：画像エリア（幅を 400px に固定。これ以上大きくさせず、右側にスペースを譲る） --- */}
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

      {/* --- 右側：情報エリア（flex: 1 により、広がった分の余白をすべて店名表示に充てる） --- */}
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
          <Text style={styles.detailTotalValue}>¥{(receipt.totalAmount || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
          {receipt.items?.map((item: any) => (
            <View key={item.id} style={styles.detailItemRow}>
              <View style={styles.detailItemTop}>
                <Text style={styles.detailItemName}>{item.name}</Text>
                <View style={styles.detailPriceContainer}>
                  <Text style={styles.detailItemPrice}>
                    ¥{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                  </Text>
                  <Text style={styles.detailItemSub}>
                    （¥{(item.price || 0).toLocaleString()} × {item.quantity || 1}）
                  </Text>
                </View>
              </View>
              <View style={styles.detailItemBottom}>
                <View style={styles.detailPickerWrapper}>
                  <Picker
                    selectedValue={item.categoryId}
                    onValueChange={(val) => onCategoryChange(item.id, val)}
                    style={styles.detailPicker}
                  >
                    <Picker.Item label="カテゴリーを選択..." value={null} color={theme.colors.text.muted} />
                    {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
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
  
  // ★ 画像エリアを「幅 400px」に固定することで、広がる器の影響を受けすぎないようにする
  wideImageColumn: { width: 400, marginRight: 40 }, 
  wideInfoColumn: { flex: 1 }, // ★ 外側の器が広がるほど、ここが横に長く伸びる
  
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
  detailTitle: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text.main },
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
  detailItemPrice: { fontWeight: '700', color: theme.colors.primary },
  detailItemSub: { fontSize: 11, color: theme.colors.text.muted, marginLeft: 4 },
  
  detailPickerWrapper: { 
    height: 48, 
    backgroundColor: theme.colors.surface, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    overflow: 'hidden',
    justifyContent: 'center'
  },
  detailPicker: { 
    width: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
});