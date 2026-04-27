import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme';
import apiClient from '../utils/apiClient';

const { width: windowWidth } = Dimensions.get('window');

interface HomeScreenProps {
  onAnalysisReady: (data: any) => void; 
  onGoToHistory: () => void;
  onGoToStats: () => void;
  onGoToCategories: () => void; 
  onGoToProductMaster: () => void; 
  currentMemberId: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onAnalysisReady, 
  onGoToHistory, 
  onGoToStats, 
  onGoToCategories,
  onGoToProductMaster,
  currentMemberId 
}) => {
  const [latestReceipt, setLatestReceipt] = useState<any>(null);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobStatus, setJobStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [latestRes, statsRes] = await Promise.all([
        apiClient.get('/receipts/latest', { params: { memberId: currentMemberId } }),
        apiClient.get('/stats/monthly', { params: { month: currentMonth } })
      ]);

      if (latestRes.data && latestRes.data.success) {
        setLatestReceipt(latestRes.data.data);
      }
      
      if (statsRes.data && statsRes.data.success) {
        setMonthlyTotal(statsRes.data.data.totalAmount || 0);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/receipts/status/${jobId}`);
        const { state, result, error } = res.data.data;
        
        setJobStatus(state);

        if (state === 'completed') {
          clearInterval(interval);
          setIsAnalyzing(false);
          setJobStatus('');
          if (result) onAnalysisReady(result);
        } else if (state === 'failed') {
          clearInterval(interval);
          setIsAnalyzing(false);
          setJobStatus('');
          Alert.alert('解析失敗', error || 'AIによる解析中にエラーが発生しました。');
        }
      } catch (err) {
        clearInterval(interval);
        setIsAnalyzing(false);
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラの使用を許可してください。');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        // SDKバージョン間の不一致を避けるため、文字列で指定
        mediaTypes: 'images' as any, 
        allowsEditing: true, // サイズ調整画面を有効化
        quality: 0.8,
      });

      if (result.canceled || !result.assets) return;

      const imageUri = result.assets[0].uri;
      const formData = new FormData();
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      // @ts-ignore
      formData.append('image', {
        uri: imageUri,
        name: `receipt_upload.${fileType}`,
        type: `image/${fileType}`,
      });

      formData.append('memberId', currentMemberId.toString());

      setIsAnalyzing(true);
      setJobStatus('uploading');

      const uploadRes = await apiClient.post('/receipts/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'x-member-id': currentMemberId.toString()
        },
      });

      if (uploadRes.data && uploadRes.data.success) {
        const jobId = uploadRes.data.data.jobId;
        setJobStatus('queued');
        pollJobStatus(jobId);
      }
    } catch (err) {
      setIsAnalyzing(false);
      console.error('handleScan Error:', err);
      Alert.alert('エラー', '画像のアップロードに失敗しました。');
    }
  };

  const isWide = windowWidth > 600;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>AI Receipt Manager</Text>
          <Text style={styles.headerTitle}>
            {currentMemberId === 1 ? '山本さんのダッシュボード' : '共有メニュー'}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>今月の利用合計</Text>
          <View style={styles.summaryAmountRow}>
            <Text style={styles.summarySymbol}>¥</Text>
            <Text style={styles.summaryAmount}>{monthlyTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <TouchableOpacity onPress={onGoToStats}>
            <Text style={styles.summaryLink}>統計の詳細を見る ›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]} 
          activeOpacity={0.8}
          onPress={handleScan}
          disabled={isAnalyzing}
        >
          <View style={styles.iconCircle}>
            {isAnalyzing ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 20 }}>📷</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.captureButtonText}>
              {isAnalyzing ? 'AI解析中...' : 'レシートを撮影・解析'}
            </Text>
            {isAnalyzing && <Text style={styles.jobStatusText}>解析結果を待っています...</Text>}
          </View>
        </TouchableOpacity>

        <View style={[styles.row, isWide && styles.wideRow]}>
          <TouchableOpacity style={[styles.menuCard, isWide && styles.wideMenuCard]} onPress={onGoToHistory}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
            <Text style={styles.menuLabel}>履歴一覧</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuCard, isWide && styles.wideMenuCard]} onPress={onGoToStats}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>📊</Text>
            <Text style={styles.menuLabel}>支出統計</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>マスタ管理</Text>
          <TouchableOpacity style={styles.settingsCard} onPress={onGoToCategories}>
            <View style={styles.settingsIconWrapper}><Text>⚙️</Text></View>
            <View style={styles.settingsTextWrapper}><Text style={styles.settingsLabel}>カテゴリー設定</Text></View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsCard, { marginTop: -10 }]} onPress={onGoToProductMaster}>
            <View style={[styles.settingsIconWrapper, { backgroundColor: '#E3F2FD' }]}><Text>🧠</Text></View>
            <View style={styles.settingsTextWrapper}><Text style={styles.settingsLabel}>学習マスタ管理</Text></View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近の登録</Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} />
          ) : latestReceipt ? (
            <TouchableOpacity style={styles.latestCard} onPress={onGoToHistory}>
              <View style={styles.cardInfo}>
                <Text style={styles.storeName} numberOfLines={1}>{latestReceipt.storeName || '店名不明'}</Text>
                <Text style={styles.dateText}>{latestReceipt.date ? new Date(latestReceipt.date).toLocaleDateString('ja-JP') : '日付不明'}</Text>
              </View>
              <Text style={styles.amountText}>¥{(latestReceipt.totalAmount || 0).toLocaleString()}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.latestCard, { justifyContent: 'center' }]}><Text style={styles.dateText}>表示できるデータがありません</Text></View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 40 },
  header: { marginBottom: theme.spacing.lg, marginTop: theme.spacing.md },
  headerSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text.main, marginTop: theme.spacing.xs },
  summaryCard: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, marginBottom: theme.spacing.lg, elevation: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  summaryAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5 },
  summarySymbol: { color: 'white', fontSize: 20, marginRight: 4, fontWeight: 'bold' },
  summaryAmount: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: theme.spacing.md },
  summaryLink: { color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'right' },
  captureButton: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed' },
  captureButtonDisabled: { borderColor: theme.colors.border, backgroundColor: '#F5F5F5' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  captureButtonText: { ...theme.typography.h2, color: theme.colors.primary },
  jobStatusText: { fontSize: 12, color: theme.colors.text.muted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  wideRow: { justifyContent: 'flex-start', gap: theme.spacing.md },
  menuCard: { backgroundColor: theme.colors.surface, width: (windowWidth - theme.spacing.lg * 2 - theme.spacing.md) / 2, maxWidth: 280, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  wideMenuCard: { width: '48%' },
  menuLabel: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text.main },
  section: { marginTop: theme.spacing.lg },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: theme.spacing.sm },
  settingsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md },
  settingsIconWrapper: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  settingsTextWrapper: { flex: 1 },
  settingsLabel: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text.main },
  arrowIcon: { fontSize: 20, color: theme.colors.text.muted },
  latestCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardInfo: { flex: 1 },
  storeName: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text.main },
  dateText: { ...theme.typography.caption, color: theme.colors.text.muted },
  amountText: { ...theme.typography.h2, color: theme.colors.primary }
});