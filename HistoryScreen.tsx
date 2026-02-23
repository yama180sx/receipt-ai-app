import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function HistoryScreen({ onBack, API_BASE }: { onBack: () => void, API_BASE: string }) {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  
  // フィルタリング用ステート
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState('1');

  // 月の選択肢（直近6ヶ月分などを生成するのが理想ですが、まずは固定または手動）
  const months = ['2026-02', '2026-01', '2025-12'];

  useEffect(() => {
    fetchReceipts();
  }, [selectedMonth, selectedMember]); // フィルターが変わるたびに再取得

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      // クエリパラメータを構築
      const url = `${API_BASE}/receipts?memberId=${selectedMember}&month=${selectedMonth}`;
      const res = await fetch(url);
      const data = await res.json();
      setReceipts(data);
    } catch (err) {
      console.error('履歴取得失敗', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString('ja-JP')}</Text>
        <Text style={styles.store}>{item.storeName}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.amount}>¥{item.totalAmount.toLocaleString()}</Text>
        <Text style={styles.itemCount}>{item.items.length} 点</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← 戻る</Text></TouchableOpacity>
        <Text style={styles.title}>レシート履歴</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* フィルタリングUI */}
      <View style={styles.filterContainer}>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={(v) => setSelectedMonth(v)}
            style={styles.filterPicker}
          >
            <Picker.Item label="全期間" value="" />
            {months.map(m => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={selectedMember}
            onValueChange={(v) => setSelectedMember(v)}
            style={styles.filterPicker}
          >
            <Picker.Item label="メンバー1" value="1" />
            <Picker.Item label="メンバー2" value="2" />
          </Picker>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>該当する履歴がありません</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  backButton: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, justifyContent: 'space-between' },
  pickerBox: { flex: 1, height: 45, backgroundColor: 'white', borderRadius: 8, marginHorizontal: 5, justifyContent: 'center', overflow: 'hidden', elevation: 1 },
  filterPicker: { width: '100%' },
  list: { paddingHorizontal: 15, paddingBottom: 30 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { color: '#888', fontSize: 13 },
  store: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  itemCount: { color: '#666', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});