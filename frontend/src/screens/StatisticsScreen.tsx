import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal, Alert, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import { theme } from '../theme'; // パスは環境に合わせて調整してください

const screenWidth = Dimensions.get('window').width;

// インターフェース定義
interface Category {
  id: number;
  name: string;
  color: string;
}

interface StatItem {
  categoryId: number | null;
  categoryName: string;
  totalAmount: number;
  color: string;
}

interface ReceiptItem {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  category?: { name: string; color: string };
}

interface ReceiptInfo {
  id: number;
  imagePath: string | null;
  storeName: string;
  totalAmount: number;
  items: ReceiptItem[];
}

export const StatisticsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [latestReceipt, setLatestReceipt] = useState<ReceiptInfo | null>(null);
  
  const [isMainModalVisible, setMainModalVisible] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  const BASE_URL = API_BASE.replace(/\/api\/?$/, '');
  const UPDATE_ITEM_URL = `${API_BASE}/receipt-items`;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, catRes] = await Promise.all([
        axios.get(`${API_BASE}/stats/monthly?month=${currentMonth}`),
        axios.get(`${API_BASE}/categories`)
      ]);
      setStats(statsRes.data.stats);
      setAllCategories(catRes.data);
      if (statsRes.data.latestReceipt) {
        setLatestReceipt(statsRes.data.latestReceipt);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId: number) => {
    if (!selectedItemId) return;
    try {
      await axios.patch(`${UPDATE_ITEM_URL}/${selectedItemId}`, { categoryId });
      setPickerVisible(false);
      await fetchData();
      Alert.alert("完了", "カテゴリーを更新しました");
    } catch (error) {
      Alert.alert("エラー", "更新に失敗しました");
    }
  };

  const chartData = stats
    .filter(s => (s.totalAmount ?? 0) > 0)
    .map(s => ({
      name: s.categoryName,
      population: s.totalAmount,
      color: s.color || theme.colors.secondary,
      legendFontColor: theme.colors.text.main,
      legendFontSize: 12,
    }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>{currentMonth} 支出状況</Text>
          <Text style={styles.headerTitle}>統計レポート</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>カテゴリー別支出</Text>
              <View style={styles.chartCard}>
                {chartData.length > 0 ? (
                  <PieChart
                    data={chartData}
                    width={screenWidth - theme.spacing.lg * 2 - 20}
                    height={220}
                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    absolute
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.noDataText}>集計データがありません</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>直近の解析レシート</Text>
              {latestReceipt?.imagePath ? (
                <TouchableOpacity 
                  style={styles.receiptPreviewCard} 
                  onPress={() => setMainModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: `${BASE_URL}/${latestReceipt.imagePath}` }}
                    style={styles.receiptImage}
                    resizeMode="cover"
                  />
                  <View style={styles.receiptInfoOverlay}>
                    <Text style={styles.receiptStoreName}>{latestReceipt.storeName}</Text>
                    <Text style={styles.receiptAmount}>¥{latestReceipt.totalAmount.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.noImageBox}>
                  <Text style={styles.noDataText}>解析済みの画像はありません</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 詳細モーダル */}
      <Modal visible={isMainModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>レシート詳細</Text>
            <TouchableOpacity onPress={() => setMainModalVisible(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {latestReceipt?.imagePath && (
              <View style={styles.modalImageWrapper}>
                <Image
                  source={{ uri: `${BASE_URL}/${latestReceipt.imagePath}` }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.itemListContainer}>
              <Text style={styles.itemListTitle}>明細一覧（タップでカテゴリ変更）</Text>
              {latestReceipt?.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>¥{item.price.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.categoryBadge, { backgroundColor: item.category?.color || theme.colors.secondary }]}
                    onPress={() => {
                      setSelectedItemId(item.id);
                      setPickerVisible(true);
                    }}
                  >
                    <Text style={styles.categoryBadgeText}>{item.category?.name || '未分類'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>

        {/* カテゴリ選択サブモーダル */}
        <Modal visible={isPickerVisible} transparent={true} animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerWindow}>
              <Text style={styles.pickerHeader}>カテゴリーを選択</Text>
              <FlatList
                data={allCategories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.pickerItem} 
                    onPress={() => handleUpdateCategory(item.id)}
                  >
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerVisible(false)}>
                <Text style={styles.pickerCancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.xl },
  headerSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text.main },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: theme.spacing.md },
  
  chartCard: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.md, 
    padding: theme.spacing.sm, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2 
  },
  emptyContainer: { height: 220, justifyContent: 'center', alignItems: 'center' },

  receiptPreviewCard: {
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.md, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 }
    })
  },
  receiptImage: { width: '100%', height: 160, backgroundColor: theme.colors.border },
  receiptInfoOverlay: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptStoreName: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text.main },
  receiptAmount: { ...theme.typography.h2, color: theme.colors.primary },

  noImageBox: { height: 100, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  noDataText: { ...theme.typography.caption, color: theme.colors.text.muted },

  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  modalTitle: { ...theme.typography.h2, color: theme.colors.text.main },
  modalCloseText: { ...theme.typography.body, color: theme.colors.error, fontWeight: '600' },
  modalScroll: { flex: 1 },
  modalImageWrapper: { padding: theme.spacing.lg, alignItems: 'center' },
  modalImage: { width: '100%', height: 300, borderRadius: theme.borderRadius.md },
  
  itemListContainer: { paddingHorizontal: theme.spacing.lg },
  itemListTitle: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.secondary, marginBottom: theme.spacing.sm, textTransform: 'uppercase' },
  itemRow: { 
    flexDirection: 'row', 
    paddingVertical: theme.spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border, 
    alignItems: 'center' 
  },
  itemName: { ...theme.typography.body, color: theme.colors.text.main },
  itemPrice: { ...theme.typography.body, fontWeight: '700', color: theme.colors.primary },
  categoryBadge: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.borderRadius.round },
  categoryBadgeText: { color: theme.colors.text.inverse, fontWeight: '700', fontSize: 12 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerWindow: { width: '85%', maxHeight: '70%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, elevation: 10 },
  pickerHeader: { ...theme.typography.h2, marginBottom: theme.spacing.md, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: theme.spacing.md },
  pickerItemText: { ...theme.typography.body, color: theme.colors.text.main },
  pickerCancel: { marginTop: theme.spacing.md, alignItems: 'center' },
  pickerCancelText: { ...theme.typography.body, color: theme.colors.error, fontWeight: '700' }
});