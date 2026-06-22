import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppListItem } from '../../../components/ui';
import { theme } from '../../../theme';
import { homeScreenStyles } from '../styles/homeScreenStyles';

type LatestReceipt = {
  storeName?: string;
  date?: string;
  totalAmount?: number;
};

type Props = {
  isWide: boolean;
  isAdmin: boolean;
  trayItemCount: number;
  loading: boolean;
  latestReceipt: LatestReceipt | null;
  onGoToReceiptTray: () => void;
  onGoToHistory: () => void;
  onGoToStats: () => void;
  onGoToSettlement?: () => void;
  onGoToAdminMenu?: () => void;
};

export const HomeMenuGrid: React.FC<Props> = ({
  isWide,
  isAdmin,
  trayItemCount,
  loading,
  latestReceipt,
  onGoToReceiptTray,
  onGoToHistory,
  onGoToStats,
  onGoToSettlement,
  onGoToAdminMenu,
}) => (
  <>
    <View style={homeScreenStyles.gridContainer}>
      <AppListItem
        variant="nav"
        onPress={onGoToReceiptTray}
        title="確認トレイ"
        subtitle={trayItemCount > 0 ? `${trayItemCount} 件の受付` : '解析状況を確認'}
        left={<Text style={homeScreenStyles.gridEmoji}>📥</Text>}
        right={
          trayItemCount > 0 ? (
            <View style={homeScreenStyles.gridCountBadge}>
              <Text style={homeScreenStyles.gridCountBadgeText}>{trayItemCount}</Text>
            </View>
          ) : (
            <View />
          )
        }
        style={homeScreenStyles.gridCard}
      />
      <AppListItem
        variant="nav"
        onPress={onGoToHistory}
        title="履歴一覧"
        left={<Text style={homeScreenStyles.gridEmoji}>📋</Text>}
        right={<View />}
        style={homeScreenStyles.gridCard}
      />
      <AppListItem
        variant="nav"
        onPress={onGoToStats}
        title="支出統計"
        left={<Text style={homeScreenStyles.gridEmoji}>📊</Text>}
        right={<View />}
        style={homeScreenStyles.gridCard}
      />
      {onGoToSettlement && isWide ? (
        <AppListItem
          variant="nav"
          onPress={onGoToSettlement}
          title="精算サマリー"
          left={<Text style={homeScreenStyles.gridEmoji}>🤝</Text>}
          right={<View />}
          style={homeScreenStyles.gridCard}
        />
      ) : null}
    </View>

    {isAdmin ? (
      <View style={homeScreenStyles.section}>
        <AppListItem
          variant="nav"
          onPress={onGoToAdminMenu}
          title="管理者メニュー"
          subtitle="マスタ管理・システム設定"
          style={homeScreenStyles.adminListItem}
          left={
            <View
              style={[
                homeScreenStyles.settingsIconWrapper,
                { backgroundColor: theme.colors.semantic.icon.adminCard },
              ]}
            >
              <Text>🛡️</Text>
            </View>
          }
        />
      </View>
    ) : null}

    <View style={homeScreenStyles.section}>
      <Text style={homeScreenStyles.sectionTitle}>最近の登録</Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={homeScreenStyles.loadingIndicator} />
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
            <Text style={homeScreenStyles.amountText}>
              ¥{Math.round(latestReceipt.totalAmount || 0).toLocaleString()}
            </Text>
          }
          style={homeScreenStyles.latestCard}
        />
      ) : (
        <View style={homeScreenStyles.latestCardEmpty}>
          <Text style={homeScreenStyles.dateText}>表示できるデータがありません</Text>
        </View>
      )}
    </View>
  </>
);
