import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from '../../../screens/HomeScreen';
import HistoryScreen from '../../../screens/HistoryScreen';
import { StatisticsScreen } from '../../../screens/StatisticsScreen';
import { CategoryManagementScreen } from '../../../screens/CategoryManagementScreen';
import { ProductMasterScreen } from '../../../screens/ProductMasterScreen';
import { ReceiptScanScreen } from '../../../screens/ReceiptScanScreen';
import { PromptEditorScreen } from '../../../screens/PromptEditorScreen';
import { AdminStatsScreen } from '../../../screens/AdminStatsScreen';
import { AdminMenuScreen } from '../../../screens/AdminMenuScreen';
import { SplitEditorScreen } from '../../../screens/SplitEditorScreen';
import { SettlementSummaryScreen } from '../../../screens/SettlementSummaryScreen';
import { ReceiptTrayScreen } from '../../../screens/ReceiptTrayScreen';
import { TotpSettingsScreen } from '../../../screens/TotpSettingsScreen';
import { DisplayModeSettings } from '../../../components/DisplayModeSettings';
import { DevEnvironmentBanner } from '../../../components/DevEnvironmentBanner';
import { theme } from '../../../theme';
import { devUiColors, isDevAppEnv } from '../../../config/appEnv';
import type { AppViewType } from '../hooks/useAppSession';
import type { ReceiptScanInitialData } from '../../../types/receiptScan';
import type { ReceiptForSplitEditor } from '../../../types/settlement';
import type { CategorySummary } from '../../../types/receipt';

export interface AppViewRouterProps {
  currentView: AppViewType;
  setCurrentView: (view: AppViewType) => void;
  currentMemberId: number;
  currentMemberName: string | null;
  currentUserRole: string | null;
  biometricEnabled: boolean;
  totpEnabled: boolean;
  setTotpEnabled: (enabled: boolean) => void;
  categories: CategorySummary[];
  resultData: ReceiptScanInitialData | null;
  targetReceipt: ReceiptForSplitEditor | null;
  setTargetReceipt: (receipt: ReceiptForSplitEditor | null) => void;
  onAnalysisReady: (data: ReceiptScanInitialData) => void;
  onScanClose: (options?: { refreshTray?: boolean }) => void;
  onLogout: () => void;
  onDisableBiometric: () => void;
  fetchCategories: () => Promise<void>;
}

export const AppViewRouter: React.FC<AppViewRouterProps> = ({
  currentView,
  setCurrentView,
  currentMemberId,
  currentMemberName,
  currentUserRole,
  biometricEnabled,
  totpEnabled,
  setTotpEnabled,
  categories,
  resultData,
  targetReceipt,
  setTargetReceipt,
  onAnalysisReady,
  onScanClose,
  onLogout,
  onDisableBiometric,
  fetchCategories,
}) => {
  const devToolbarStyle = isDevAppEnv()
    ? { backgroundColor: devUiColors.toolbarBg, borderBottomColor: devUiColors.toolbarBorder }
    : null;

  switch (currentView) {
    case 'history':
      return (
        <HistoryScreen
          onBack={() => setCurrentView('main')}
          currentMemberId={currentMemberId}
          onGoToSplitEditor={(receipt) => {
            setTargetReceipt(receipt);
            setCurrentView('split_editor');
          }}
        />
      );
    case 'split_editor':
      return targetReceipt ? (
        <SplitEditorScreen
          receipt={targetReceipt}
          onBack={() => {
            setTargetReceipt(null);
            setCurrentView('history');
          }}
        />
      ) : null;
    case 'settlement_summary':
      return <SettlementSummaryScreen onBack={() => setCurrentView('main')} />;
    case 'stats':
      return (
        <StatisticsScreen
          currentMemberId={currentMemberId}
          onBack={() => setCurrentView('main')}
        />
      );
    case 'category_mgr':
      return (
        <CategoryManagementScreen
          onBack={() => {
            void fetchCategories();
            setCurrentView('admin_menu');
          }}
          currentMemberId={currentMemberId}
        />
      );
    case 'product_master':
      return (
        <ProductMasterScreen
          onBack={() => setCurrentView('admin_menu')}
          currentMemberId={currentMemberId}
        />
      );
    case 'receipt_tray':
      return <ReceiptTrayScreen onBack={() => setCurrentView('main')} />;
    case 'receipt_scan':
      return resultData ? (
        <ReceiptScanScreen
          initialData={resultData}
          categories={categories}
          onSuccess={() => onScanClose({ refreshTray: true })}
          onCancel={() => onScanClose()}
        />
      ) : null;
    case 'prompt_editor':
      return <PromptEditorScreen onBack={() => setCurrentView('admin_menu')} />;
    case 'admin_stats':
      return <AdminStatsScreen onBack={() => setCurrentView('admin_menu')} />;
    case 'admin_menu':
      return (
        <AdminMenuScreen
          onBack={() => setCurrentView('main')}
          onGoToCategories={() => setCurrentView('category_mgr')}
          onGoToProductMaster={() => setCurrentView('product_master')}
          onGoToPromptEditor={() => setCurrentView('prompt_editor')}
          onGoToAdminStats={() => setCurrentView('admin_stats')}
        />
      );
    case 'totp_settings':
      return (
        <TotpSettingsScreen
          totpEnabled={totpEnabled}
          onBack={() => setCurrentView('main')}
          onChanged={setTotpEnabled}
        />
      );
    default:
      return (
        <View style={styles.mainWithToolbar}>
          <DevEnvironmentBanner />
          <SafeAreaView edges={['top']} style={[styles.mainToolbar, devToolbarStyle]}>
            <View style={styles.topActions}>
              <DisplayModeSettings />
              <View style={styles.topActionButtons}>
                {currentMemberName ? (
                  <Text style={styles.memberNameText} numberOfLines={1}>
                    {currentMemberName}
                  </Text>
                ) : null}
                {biometricEnabled && Platform.OS !== 'web' ? (
                  <TouchableOpacity style={styles.topActionButton} onPress={onDisableBiometric}>
                    <Text style={styles.topActionText}>生体認証オフ</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.topActionButton} onPress={onLogout}>
                  <Text style={styles.topActionText}>ログアウト</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          <HomeScreen
            onAnalysisReady={onAnalysisReady}
            onGoToHistory={() => setCurrentView('history')}
            onGoToStats={() => setCurrentView('stats')}
            onGoToReceiptTray={() => setCurrentView('receipt_tray')}
            onGoToSettlement={() => setCurrentView('settlement_summary')}
            onGoToAdminMenu={() => setCurrentView('admin_menu')}
            currentMemberId={currentMemberId}
            memberName={currentMemberName}
            userRole={currentUserRole}
          />
        </View>
      );
  }
};

const styles = StyleSheet.create({
  mainWithToolbar: { flex: 1 },
  mainToolbar: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  topActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  topActionButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 10,
  },
  topActionText: { color: theme.colors.text.muted, fontSize: 12, fontWeight: 'bold' },
  memberNameText: {
    color: theme.colors.text.main,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
});
