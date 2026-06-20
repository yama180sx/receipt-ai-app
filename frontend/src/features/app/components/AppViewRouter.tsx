import React from 'react';
import { StyleSheet, View } from 'react-native';
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
import { DevEnvironmentBanner } from '../../../components/DevEnvironmentBanner';
import { MainToolbar } from './MainToolbar';
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
          <MainToolbar
            memberName={currentMemberName}
            biometricEnabled={biometricEnabled}
            onDisableBiometric={onDisableBiometric}
            onLogout={onLogout}
          />

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
});
