import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ReceiptTrayPanel } from '../../../components/ReceiptTrayPanel';
import type { ReceiptTrayItem } from '../../../types/receiptJob';
import { homeScreenStyles } from '../styles/homeScreenStyles';

const HOME_TRAY_PREVIEW_LIMIT = 2;

type Props = {
  trayItems: ReceiptTrayItem[];
  trayItemCount: number;
  onGoToReceiptTray: () => void;
  onItemPress: (item: ReceiptTrayItem) => void;
  onItemDiscard: (item: ReceiptTrayItem) => void;
  onItemRetry: (item: ReceiptTrayItem) => void;
  canOpenItem: (item: ReceiptTrayItem) => boolean;
  canDiscardItem: (item: ReceiptTrayItem) => boolean;
  canRetryItem: (item: ReceiptTrayItem) => boolean;
  retryingJobId: string | null;
};

export const HomeTrayPreview: React.FC<Props> = ({
  trayItems,
  trayItemCount,
  onGoToReceiptTray,
  onItemPress,
  onItemDiscard,
  onItemRetry,
  canOpenItem,
  canDiscardItem,
  canRetryItem,
  retryingJobId,
}) => (
  <View style={homeScreenStyles.traySection}>
    <View style={homeScreenStyles.traySectionHeader}>
      <Text style={homeScreenStyles.sectionTitle}>確認トレイ</Text>
      {trayItemCount > 0 ? (
        <TouchableOpacity onPress={onGoToReceiptTray}>
          <Text style={homeScreenStyles.trayOpenLink}>すべて見る</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    <ReceiptTrayPanel
      items={trayItems}
      maxItems={HOME_TRAY_PREVIEW_LIMIT}
      showSectionHeaders={trayItemCount > 0}
      onOpenFullTray={onGoToReceiptTray}
      onItemPress={onItemPress}
      onItemDiscard={onItemDiscard}
      onItemRetry={onItemRetry}
      canOpenItem={canOpenItem}
      canDiscardItem={canDiscardItem}
      canRetryItem={canRetryItem}
      retryingJobId={retryingJobId}
      emptyTitle="確認待ちのレシートはありません"
      emptyDescription="撮影したレシートの解析状況がここに表示されます。"
    />
  </View>
);
