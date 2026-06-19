import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppButton, AppListItem, AppModal } from '../components/ui';
import { ReceiptImageCropModal } from '../components/ReceiptImageCropModal';
import { ReceiptTrayPanel } from '../components/ReceiptTrayPanel';
import { getAppDisplayName, getMemberMenuTitle, isDevAppEnv } from '../config/appEnv';
import { useReceiptTray } from '../contexts/ReceiptTrayContext';
import { theme } from '../theme';
import apiClient from '../utils/apiClient';
import { buildReceiptUploadFormData } from '../utils/receiptUploadFormData';
import {
  consumePendingCropUri,
  persistPendingCropUri,
  registerWebImageFile,
  clearPendingCropUri,
} from '../utils/webImageFileRegistry';
import { showAlert } from '../utils/alertMessage';
import { getCurrentYearMonth } from '../utils/monthSelectOptions';
import { useIsWideHomeMenu } from '../hooks/useIsWideLayout';
import type { ReceiptScanInitialData } from '../types/receiptScan';

interface HomeScreenProps {
  onAnalysisReady: (data: ReceiptScanInitialData) => void;
  onGoToHistory: () => void;
  onGoToStats: () => void;
  onGoToReceiptTray: () => void;
  onGoToSettlement?: () => void;
  onGoToAdminMenu?: () => void;
  currentMemberId: number;
  memberName?: string | null;
  userRole?: string | null;
}

const ACCEPTANCE_MESSAGE_MS = 3000;
const HOME_TRAY_PREVIEW_LIMIT = 2;

/**
 * ホーム画面（ダッシュボード）
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({
  onAnalysisReady: _onAnalysisReady,
  onGoToHistory,
  onGoToStats,
  onGoToReceiptTray,
  onGoToSettlement,
  onGoToAdminMenu,
  currentMemberId,
  memberName,
  userRole,
}) => {
  const [latestReceipt, setLatestReceipt] = useState<any>(null);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [acceptanceMessage, setAcceptanceMessage] = useState<string | null>(null);
  const [pendingCropUri, setPendingCropUri] = useState<string | null>(null);
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);

  const {
    activeCount,
    refresh: refreshJobs,
    trayItems,
    trayItemCount,
    addLocalFailedJob,
    openTrayItem,
    discardTrayItem,
    canOpenTrayItem,
    canDiscardTrayItem,
  } = useReceiptTray();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = getCurrentYearMonth();
      const [latestRes, statsRes] = await Promise.all([
        apiClient.get('/receipts/latest', { params: { memberId: currentMemberId } }),
        apiClient.get('/stats/monthly', { params: { month: currentMonth } }),
      ]);

      if (latestRes.data && latestRes.data.success) {
        setLatestReceipt(latestRes.data.data);
      }

      if (statsRes.data && statsRes.data.success) {
        const total = statsRes.data.data.totalAmount || 0;
        setMonthlyTotal(Math.round(total));
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      loading && setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const restored = consumePendingCropUri();
    if (restored) {
      setPendingCropUri(restored);
    }
  }, []);

  useEffect(() => {
    if (!acceptanceMessage) return;
    const timer = setTimeout(() => setAcceptanceMessage(null), ACCEPTANCE_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [acceptanceMessage]);

  const showAcceptanceFeedback = useCallback((message: string) => {
    setAcceptanceMessage(message);
  }, []);

  const registerLocalUploadFailure = useCallback(
    (reason: string) => {
      addLocalFailedJob(reason);
    },
    [addLocalFailedJob]
  );

  const uploadReceiptImage = async (imageUri: string) => {
    setUploadingCount((count) => count + 1);
    try {
      const formData = await buildReceiptUploadFormData(imageUri, currentMemberId);
      const uploadRes = await apiClient.post('/receipts/upload', formData, {
        headers: {
          'x-member-id': currentMemberId.toString(),
        },
      });

      if (uploadRes.data?.success) {
        showAcceptanceFeedback('受付しました。解析結果は下の一覧に表示されます。');
        await refreshJobs();
        return;
      }

      registerLocalUploadFailure('サーバーが受付を拒否しました。');
      showAlert('エラー', 'レシートの受付に失敗しました。');
    } catch (err) {
      console.error('uploadReceiptImage', err);
      const message =
        err instanceof Error ? err.message : '画像のアップロードに失敗しました。';
      registerLocalUploadFailure(message);
      if (Platform.OS === 'web') {
        showAlert('エラー', message);
      } else {
        Alert.alert('エラー', message);
      }
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  };

  const openWebCrop = (imageUri: string) => {
    if (Platform.OS === 'web') {
      persistPendingCropUri(imageUri);
    }
    setPendingCropUri(imageUri);
  };

  const pickImageForWeb = async (source: 'camera' | 'library') => {
    try {
      const picker =
        source === 'camera'
          ? ImagePicker.launchCameraAsync({ mediaTypes: 'images' as const, quality: 0.8 })
          : ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' as const, quality: 0.8 });
      const result = await picker;
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (Platform.OS === 'web' && asset.file) {
        registerWebImageFile(asset.uri, asset.file);
      }
      openWebCrop(asset.uri);
    } catch (err) {
      console.error('pickImageForWeb', err);
      showAlert('エラー', '画像の取得に失敗しました。ギャラリーから選択をお試しください。');
    }
  };

  const pickImageNative = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラの使用を許可してください。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images' as const,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadReceiptImage(result.assets[0].uri);
  };

  const handleScan = async () => {
    if (Platform.OS === 'web') {
      setShowImageSourcePicker(true);
      return;
    }

    try {
      await pickImageNative();
    } catch (err) {
      console.error('handleScan Error:', err);
      Alert.alert('エラー', '画像のアップロードに失敗しました。');
    }
  };

  const handleCropConfirm = async (croppedUri: string) => {
    clearPendingCropUri();
    setPendingCropUri(null);
    await uploadReceiptImage(croppedUri);
  };

  const handleCropCancel = () => {
    clearPendingCropUri();
    setPendingCropUri(null);
  };

  const pendingBadgeCount = activeCount + uploadingCount;
  const isWide = useIsWideHomeMenu();
  const isAdmin = userRole === 'ADMIN';

  return (
    <>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.header, isDevAppEnv() && styles.headerDev]}>
            <Text style={styles.headerSubtitle}>{getAppDisplayName()}</Text>
            <Text style={styles.headerTitle}>{getMemberMenuTitle(memberName)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>今月の利用合計</Text>
            <View style={styles.summaryAmountRow}>
              <Text style={styles.summarySymbol}>¥</Text>
              <Text style={styles.summaryAmount}>{monthlyTotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <AppButton
              title="統計の詳細を見る ›"
              onPress={onGoToStats}
              variant="outline"
              size="sm"
              style={styles.summaryLinkButton}
              textStyle={styles.summaryLinkText}
            />
          </View>

          {acceptanceMessage ? (
            <View style={styles.acceptanceBanner}>
              <Text style={styles.acceptanceBannerText}>{acceptanceMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.captureButton} activeOpacity={0.8} onPress={handleScan}>
            <View style={styles.iconCircle}>
              {uploadingCount > 0 ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 20 }}>📷</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.captureButtonText}>レシートを撮影・解析</Text>
              {pendingBadgeCount > 0 ? (
                <Text style={styles.captureSubText}>
                  解析中 {pendingBadgeCount} 件 — 続けて撮影できます
                </Text>
              ) : null}
            </View>
            {trayItemCount > 0 ? (
              <View style={styles.captureCountBadge}>
                <Text style={styles.captureCountBadgeText}>{trayItemCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.traySection}>
            <View style={styles.traySectionHeader}>
              <Text style={styles.sectionTitle}>確認トレイ</Text>
              {trayItemCount > 0 ? (
                <TouchableOpacity onPress={onGoToReceiptTray}>
                  <Text style={styles.trayOpenLink}>すべて見る</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <ReceiptTrayPanel
              items={trayItems}
              maxItems={HOME_TRAY_PREVIEW_LIMIT}
              showSectionHeaders={trayItemCount > 0}
              onOpenFullTray={onGoToReceiptTray}
              onItemPress={(item) => void openTrayItem(item)}
              onItemDiscard={(item) => void discardTrayItem(item)}
              canOpenItem={canOpenTrayItem}
              canDiscardItem={canDiscardTrayItem}
              emptyTitle="確認待ちのレシートはありません"
              emptyDescription="撮影したレシートの解析状況がここに表示されます。"
            />
          </View>

          <View style={styles.gridContainer}>
            <AppListItem
              variant="nav"
              onPress={onGoToReceiptTray}
              title="確認トレイ"
              subtitle={trayItemCount > 0 ? `${trayItemCount} 件の受付` : '解析状況を確認'}
              left={<Text style={styles.gridEmoji}>📥</Text>}
              right={
                trayItemCount > 0 ? (
                  <View style={styles.gridCountBadge}>
                    <Text style={styles.gridCountBadgeText}>{trayItemCount}</Text>
                  </View>
                ) : (
                  <View />
                )
              }
              style={styles.gridCard}
            />
            <AppListItem
              variant="nav"
              onPress={onGoToHistory}
              title="履歴一覧"
              left={<Text style={styles.gridEmoji}>📋</Text>}
              right={<View />}
              style={styles.gridCard}
            />
            <AppListItem
              variant="nav"
              onPress={onGoToStats}
              title="支出統計"
              left={<Text style={styles.gridEmoji}>📊</Text>}
              right={<View />}
              style={styles.gridCard}
            />
            {onGoToSettlement && isWide && (
              <AppListItem
                variant="nav"
                onPress={onGoToSettlement}
                title="精算サマリー"
                left={<Text style={styles.gridEmoji}>🤝</Text>}
                right={<View />}
                style={styles.gridCard}
              />
            )}
          </View>

          {isAdmin && (
            <View style={styles.section}>
              <AppListItem
                variant="nav"
                onPress={onGoToAdminMenu}
                title="管理者メニュー"
                subtitle="マスタ管理・システム設定"
                style={{ backgroundColor: theme.colors.semantic.icon.adminSettings }}
                left={
                  <View
                    style={[
                      styles.settingsIconWrapper,
                      { backgroundColor: theme.colors.semantic.icon.adminCard },
                    ]}
                  >
                    <Text>🛡️</Text>
                  </View>
                }
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近の登録</Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} />
            ) : latestReceipt ? (
              <AppListItem
                variant="nav"
                onPress={onGoToHistory}
                title={latestReceipt.storeName || '店名不明'}
                subtitle={
                  latestReceipt.date
                    ? new Date(latestReceipt.date).toLocaleDateString('ja-JP')
                    : '日付不明'
                }
                right={
                  <Text style={styles.amountText}>
                    ¥{Math.round(latestReceipt.totalAmount || 0).toLocaleString()}
                  </Text>
                }
                style={styles.latestCard}
              />
            ) : (
              <View style={[styles.latestCard, { justifyContent: 'center' }]}>
                <Text style={styles.dateText}>表示できるデータがありません</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <AppModal
          visible={showImageSourcePicker}
          onRequestClose={() => setShowImageSourcePicker(false)}
          title="レシート画像"
          description="取得方法を選んでください"
          footer={
            <View style={styles.sourcePickerActions}>
              <AppButton
                title="カメラ"
                onPress={() => {
                  setShowImageSourcePicker(false);
                  void pickImageForWeb('camera');
                }}
              />
              <AppButton
                title="ギャラリー"
                variant="secondary"
                onPress={() => {
                  setShowImageSourcePicker(false);
                  void pickImageForWeb('library');
                }}
              />
              <AppButton
                title="キャンセル"
                variant="outline"
                onPress={() => setShowImageSourcePicker(false)}
              />
            </View>
          }
        />
      </SafeAreaView>

      {pendingCropUri ? (
        <ReceiptImageCropModal
          visible
          imageUri={pendingCropUri}
          onConfirm={(uri) => void handleCropConfirm(uri)}
          onCancel={handleCropCancel}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 40 },
  header: { marginBottom: theme.spacing.lg, marginTop: theme.spacing.md },
  headerDev: {
    borderLeftWidth: 4,
    borderLeftColor: '#b45309',
    paddingLeft: theme.spacing.sm,
  },
  headerSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, letterSpacing: 0.5 },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text.main, marginTop: theme.spacing.xs },
  summaryCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    elevation: 4,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  summaryAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5 },
  summarySymbol: { color: theme.colors.text.inverse, fontSize: 20, marginRight: 4, fontWeight: 'bold' },
  summaryAmount: { color: theme.colors.text.inverse, fontSize: 36, fontWeight: 'bold' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: theme.spacing.md },
  summaryLinkButton: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.xs,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  summaryLinkText: { color: theme.colors.text.inverse, fontSize: 14, fontWeight: '600' },
  acceptanceBanner: {
    backgroundColor: theme.colors.semantic.surplus.bg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.semantic.surplus.border,
  },
  acceptanceBannerText: {
    color: theme.colors.semantic.surplus.text,
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  captureButtonText: { ...theme.typography.h2, color: theme.colors.primary },
  captureSubText: { fontSize: 12, color: theme.colors.text.muted, marginTop: 4 },
  captureCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  captureCountBadgeText: { color: theme.colors.text.inverse, fontSize: 12, fontWeight: '700' },
  traySection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  traySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  trayOpenLink: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  gridCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  gridCountBadgeText: { color: theme.colors.text.inverse, fontSize: 11, fontWeight: '700' },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  gridCard: { flexGrow: 1, minWidth: 100, flexBasis: '30%' },
  gridEmoji: { fontSize: 28 },
  section: { marginTop: theme.spacing.lg },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: theme.spacing.sm },
  settingsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  latestCard: { marginBottom: 0 },
  amountText: { ...theme.typography.h2, color: theme.colors.primary, fontWeight: 'bold' },
  dateText: { ...theme.typography.caption, color: theme.colors.text.muted },
  sourcePickerActions: { gap: 10, width: '100%' },
});
