import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '../../../components/ui';
import { getAppDisplayName, getMemberMenuTitle, isDevAppEnv } from '../../../config/appEnv';
import { homeScreenStyles } from '../styles/homeScreenStyles';

type Props = {
  memberName?: string | null;
  monthlyTotal: number;
  onGoToStats: () => void;
};

export const HomeDashboardCard: React.FC<Props> = ({ memberName, monthlyTotal, onGoToStats }) => (
  <>
    <View style={[homeScreenStyles.header, isDevAppEnv() && homeScreenStyles.headerDev]}>
      <Text style={homeScreenStyles.headerSubtitle}>{getAppDisplayName()}</Text>
      <Text style={homeScreenStyles.headerTitle}>{getMemberMenuTitle(memberName)}</Text>
    </View>

    <View style={homeScreenStyles.summaryCard}>
      <Text style={homeScreenStyles.summaryLabel}>今月の利用合計</Text>
      <View style={homeScreenStyles.summaryAmountRow}>
        <Text style={homeScreenStyles.summarySymbol}>¥</Text>
        <Text style={homeScreenStyles.summaryAmount}>{monthlyTotal.toLocaleString()}</Text>
      </View>
      <View style={homeScreenStyles.summaryDivider} />
      <AppButton
        title="統計の詳細を見る ›"
        onPress={onGoToStats}
        variant="outline"
        size="sm"
        style={homeScreenStyles.summaryLinkButton}
        textStyle={homeScreenStyles.summaryLinkText}
      />
    </View>
  </>
);
