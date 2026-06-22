import React from 'react';
import { Text, View } from 'react-native';
import { cardStyles, theme } from '../../../theme';
import type { MonthlyStatsViewModel } from '../../../types/stats';
import { statsScreenStyles } from '../styles/statsScreenStyles';

type Props = {
  data: MonthlyStatsViewModel | null;
};

export const StatsSummaryCard: React.FC<Props> = ({ data }) => (
  <View style={cardStyles.summaryCard}>
    <Text style={statsScreenStyles.summaryLabel}>当月合計支出（税込）</Text>
    <Text style={statsScreenStyles.totalValue}>
      ¥{Math.round(Number(data?.totalAmount) || 0).toLocaleString()}
    </Text>
    <View style={statsScreenStyles.comparisonRow}>
      <Text style={statsScreenStyles.comparisonLabel}>前月比:</Text>
      <Text
        style={[
          statsScreenStyles.diffValue,
          { color: (data?.diffAmount || 0) > 0 ? theme.colors.error : theme.colors.success },
        ]}
      >
        {(data?.diffAmount || 0) > 0 ? '▲' : '▼'} ¥
        {Math.abs(Math.round(Number(data?.diffAmount) || 0)).toLocaleString()} ({data?.diffPercentage || 0}%)
      </Text>
    </View>
  </View>
);
