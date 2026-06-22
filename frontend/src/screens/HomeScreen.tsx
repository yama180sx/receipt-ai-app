import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppModal } from '../components/ui';
import { ReceiptImageCropModal } from '../components/ReceiptImageCropModal';
import { useReceiptTray } from '../contexts/ReceiptTrayContext';
import {
  HomeCaptureButton,
  HomeDashboardCard,
  HomeMenuGrid,
  HomeTrayPreview,
  homeScreenStyles,
  useHomeDashboard,
  useReceiptUpload,
} from '../features/home';
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

/** [Issue #100-9] ホーム画面 — View は features/home/components へ分離 */
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
  const tray = useReceiptTray();
  const { latestReceipt, monthlyTotal, loading } = useHomeDashboard(currentMemberId);
  const upload = useReceiptUpload({
    currentMemberId,
    onUploadAccepted: tray.refresh,
    registerLocalUploadFailure: tray.addLocalFailedJob,
  });

  const pendingBadgeCount = tray.activeCount + upload.uploadingCount;
  const isWide = useIsWideHomeMenu();
  const isAdmin = userRole === 'ADMIN';

  return (
    <>
      <SafeAreaView style={homeScreenStyles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={homeScreenStyles.scrollContent}>
          <HomeDashboardCard
            memberName={memberName}
            monthlyTotal={monthlyTotal}
            onGoToStats={onGoToStats}
          />

          <HomeCaptureButton
            acceptanceMessage={upload.acceptanceMessage}
            uploadingCount={upload.uploadingCount}
            pendingBadgeCount={pendingBadgeCount}
            trayItemCount={tray.trayItemCount}
            onPress={() => void upload.handleScan()}
          />

          <HomeTrayPreview
            trayItems={tray.trayItems}
            trayItemCount={tray.trayItemCount}
            onGoToReceiptTray={onGoToReceiptTray}
            onItemPress={(item) => void tray.openTrayItem(item)}
            onItemDiscard={(item) => void tray.discardTrayItem(item)}
            canOpenItem={tray.canOpenTrayItem}
            canDiscardItem={tray.canDiscardTrayItem}
          />

          <HomeMenuGrid
            isWide={isWide}
            isAdmin={isAdmin}
            trayItemCount={tray.trayItemCount}
            loading={loading}
            latestReceipt={latestReceipt}
            onGoToReceiptTray={onGoToReceiptTray}
            onGoToHistory={onGoToHistory}
            onGoToStats={onGoToStats}
            onGoToSettlement={onGoToSettlement}
            onGoToAdminMenu={onGoToAdminMenu}
          />
        </ScrollView>

        <AppModal
          visible={upload.showImageSourcePicker}
          onRequestClose={() => upload.setShowImageSourcePicker(false)}
          title="レシート画像"
          description="取得方法を選んでください"
          footer={
            <View style={homeScreenStyles.sourcePickerActions}>
              <AppButton
                title="カメラ"
                onPress={() => {
                  upload.setShowImageSourcePicker(false);
                  void upload.pickImageForWeb('camera');
                }}
              />
              <AppButton
                title="ギャラリー"
                variant="secondary"
                onPress={() => {
                  upload.setShowImageSourcePicker(false);
                  void upload.pickImageForWeb('library');
                }}
              />
              <AppButton
                title="キャンセル"
                variant="outline"
                onPress={() => upload.setShowImageSourcePicker(false)}
              />
            </View>
          }
        />
      </SafeAreaView>

      {upload.pendingCropUri ? (
        <ReceiptImageCropModal
          visible
          imageUri={upload.pendingCropUri}
          onConfirm={(uri) => void upload.handleCropConfirm(uri)}
          onCancel={upload.handleCropCancel}
        />
      ) : null}
    </>
  );
};
