import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import axios from 'axios';

// 接続先IPをT320の環境に合わせて適宜変更してください
const T320_IP = '192.168.1.32'; // ← ここをご自身のT320のIPに書き換えてください
const API_URL = `http://${T320_IP}:3000/api/stats/monthly`;
const screenWidth = Dimensions.get('window').width;

interface StatItem {
  categoryId: number | null;
  categoryName: string;
  totalAmount: number;
  color: string;
}

export const StatisticsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);
  const currentMonth = '2026-02'; // 現在のデモ月

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}?month=${currentMonth}`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // グラフ用データ整形
  const chartData = stats.map(s => ({
    name: s.categoryName,
    population: s.totalAmount,
    color: s.color || '#999',
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{currentMonth} 支出分布</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : stats.length > 0 ? (
        <View style={styles.chartBox}>
          <PieChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        </View>
      ) : (
        <Text style={styles.noData}>集計データがありません</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  chartBox: { alignItems: 'center' },
  noData: { textAlign: 'center', marginTop: 50, color: '#999' }
});