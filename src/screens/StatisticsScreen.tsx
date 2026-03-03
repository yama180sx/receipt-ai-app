import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal, Button, Alert, FlatList } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const BASE_URL = API_BASE.replace(/\/api\/?$/, '');
const API_URL = `${API_BASE}/stats/monthly`;
const CAT_URL = `${API_BASE}/categories`;
const UPDATE_ITEM_URL = `${API_BASE}/receipt-items`;
const screenWidth = Dimensions.get('window').width;

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
  
  // モーダル制御用
  const [isMainModalVisible, setMainModalVisible] = useState(false); // 詳細表示
  const [isPickerVisible, setPickerVisible] = useState(false);       // カテゴリ選択
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // とりあえず当月を対象にする（必要ならUIで月選択に拡張）
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, catRes] = await Promise.all([
        axios.get(`${API_URL}?month=${currentMonth}`),
        axios.get(CAT_URL)
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

  // カテゴリ選択モーダルを開く
  const openPicker = (itemId: number) => {
    setSelectedItemId(itemId);
    setPickerVisible(true);
  };

  // 実際の更新処理
  const handleUpdateCategory = async (categoryId: number) => {
    if (!selectedItemId) return;
    try {
      await axios.patch(`${UPDATE_ITEM_URL}/${selectedItemId}`, { categoryId });
      setPickerVisible(false);
      await fetchData(); // データを最新化
      Alert.alert("完了", "カテゴリーを更新しました");
    } catch (error) {
      Alert.alert("エラー", "更新に失敗しました");
    }
  };

  // 0円のスライスが混ざるとライブラリ側でNaNが出て落ちるケースがあるため除外する
  const chartData = stats
    .filter(s => (s.totalAmount ?? 0) > 0)
    .map(s => ({
    name: s.categoryName,
    population: s.totalAmount,
    color: s.color || '#999',
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{currentMonth} 支出状況</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
      ) : (
        <>
          {latestReceipt?.imagePath ? (
            <TouchableOpacity style={styles.receiptPreviewBox} onPress={() => setMainModalVisible(true)}>
              <Text style={styles.subTitle}>直近のレシート（タップで詳細）</Text>
              {/* Androidのメモリ圧迫で落ちることがあるため、可能な限り縮小デコードさせる */}
              <Image
                source={{ uri: `${BASE_URL}/${latestReceipt.imagePath}` }}
                style={styles.receiptImage}
                resizeMode="cover"
                resizeMethod="resize"
                onError={(e) => console.error('receipt preview image load error', e.nativeEvent)}
              />
              <Text style={styles.receiptDetail}>{latestReceipt.storeName} : ¥{latestReceipt.totalAmount.toLocaleString()}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noImageBox}><Text style={styles.noDataText}>解析済みの画像はありません</Text></View>
          )}

          <Text style={styles.subTitle}>カテゴリー別分布</Text>
          {chartData.length > 0 ? (
            <View style={styles.chartBox}>
              <PieChart
                data={chartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </View>
          ) : (
            <Text style={styles.noData}>集計データがありません</Text>
          )}
        </>
      )}

      {/* --- メイン詳細モーダル --- */}
      <Modal visible={isMainModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>レシート詳細・修正</Text>
          {latestReceipt?.imagePath ? (
            <Image
              source={{ uri: `${BASE_URL}/${latestReceipt.imagePath}` }}
              style={styles.modalImage}
              resizeMode="contain"
              resizeMethod="resize"
              onError={(e) => console.error('receipt modal image load error', e.nativeEvent)}
            />
          ) : null}
          <ScrollView style={styles.modalItemList}>
            {latestReceipt?.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>¥{item.price.toLocaleString()}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.categoryBadge, { backgroundColor: item.category?.color || '#999' }]}
                  onPress={() => openPicker(item.id)}
                >
                  <Text style={styles.categoryText}>{item.category?.name || '未分類'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}><Button title="閉じる" onPress={() => setMainModalVisible(false)} /></View>
        </View>

        {/* --- カテゴリ選択サブモーダル (独自ピッカー) --- */}
        <Modal visible={isPickerVisible} transparent={true} animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerWindow}>
              <Text style={styles.pickerTitle}>カテゴリーを選択</Text>
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
                <Text style={{ color: 'red', fontWeight: 'bold' }}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#333' },
  subTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#555', marginLeft: 8 },
  receiptPreviewBox: {
    backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 24,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  receiptImage: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#eee' },
  receiptDetail: { marginTop: 8, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#333' },
  chartBox: { backgroundColor: '#fff', borderRadius: 15, padding: 8, alignItems: 'center', elevation: 2 },
  noData: { textAlign: 'center', marginTop: 20, color: '#999' },
  noImageBox: { height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  noDataText: { color: '#999', fontSize: 12 },
  // モーダル用
  modalContent: { flex: 1, backgroundColor: '#fff', padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, marginTop: 40 },
  modalImage: { width: '100%', height: 250, marginBottom: 20, borderRadius: 10 },
  modalItemList: { flex: 1 },
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemPrice: { fontSize: 14, color: '#666' },
  categoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  categoryText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  modalFooter: { paddingVertical: 20 },
  // ピッカー用
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerWindow: { width: '80%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  pickerItemText: { fontSize: 16 },
  pickerCancel: { marginTop: 20, alignItems: 'center' }
});