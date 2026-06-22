import React from 'react';
import { Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { cardStyles } from '../../../theme/cardStyles';
import type { StatsChartSlice } from '../hooks/useStatistics';
import { statsScreenStyles } from '../styles/statsScreenStyles';

type Props = {
  chartData: StatsChartSlice[];
  chartWidth: number;
};

export const StatsPieChart: React.FC<Props> = ({ chartData, chartWidth }) => (
  <View style={cardStyles.chartCard}>
    {chartData.length > 0 ? (
      <PieChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    ) : (
      <Text style={statsScreenStyles.noDataText}>カテゴリー別データがありません</Text>
    )}
  </View>
);
