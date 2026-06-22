import React from 'react';
import { Text, View } from 'react-native';
import { cardStyles, theme } from '../../../theme';
import type { ParetoStatItem, TrendStatItem } from '../../../types/stats';
import { statsScreenStyles } from '../styles/statsScreenStyles';

type TrendProps = {
  trend: TrendStatItem[] | undefined;
};

export const StatsTrendSection: React.FC<TrendProps> = ({ trend }) => (
  <View style={cardStyles.section}>
    <Text style={statsScreenStyles.sectionTitle}>月次推移 (MoM Trend)</Text>
    <View style={statsScreenStyles.statsCard}>
      {trend?.map((t, i) => {
        const diff = t.prevTotal != null ? t.total - t.prevTotal : 0;
        return (
          <View key={i} style={statsScreenStyles.trendRow}>
            <Text style={statsScreenStyles.trendPeriod}>{t.period}</Text>
            <Text style={statsScreenStyles.trendAmount}>
              ¥{Math.round(Number(t.total) || 0).toLocaleString()}
            </Text>
            <Text
              style={[
                statsScreenStyles.trendDiff,
                { color: diff > 0 ? theme.colors.error : theme.colors.success },
              ]}
            >
              {t.prevTotal !== null ? `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString()}` : '-'}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
);

type ParetoProps = {
  pareto: ParetoStatItem[] | undefined;
};

export const StatsParetoSection: React.FC<ParetoProps> = ({ pareto }) => (
  <View style={cardStyles.section}>
    <Text style={statsScreenStyles.sectionTitle}>費目別分析 (Pareto 80/20)</Text>
    <View style={statsScreenStyles.statsCard}>
      {pareto?.map((p, i) => (
        <View key={i} style={statsScreenStyles.paretoWrapper}>
          <View style={statsScreenStyles.paretoTextRow}>
            <Text style={statsScreenStyles.paretoName}>{p.name}</Text>
            <Text style={statsScreenStyles.paretoValue}>
              ¥{Math.round(Number(p.amount) || 0).toLocaleString()} ({p.ratio}%)
            </Text>
          </View>
          <View style={statsScreenStyles.paretoBarContainer}>
            <View
              style={[
                statsScreenStyles.paretoBar,
                {
                  width: `${p.ratio}%`,
                  backgroundColor:
                    p.cumulativeRatio <= 80
                      ? theme.colors.primary
                      : theme.colors.semantic.chart.barInactive,
                },
              ]}
            />
            <Text style={statsScreenStyles.cumText}>{p.cumulativeRatio}%</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);
