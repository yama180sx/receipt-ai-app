import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton, AppModal, AppSelect } from '../components/ui';
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';
import {
  StatsLatestReceiptPreview,
  StatsPieChart,
  StatsParetoSection,
  StatsSummaryCard,
  StatsTrendSection,
  statsScreenStyles,
  useStatistics,
} from '../features/stats';
import { screenLayout, theme, cardStyles } from '../theme';

interface StatisticsScreenProps {
  currentMemberId: number;
  onBack: () => void;
}

/**
 * [Issue #67 / #71 / #100-8] 家計統計画面 — step router 相当の薄型 Screen
 */
export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ currentMemberId, onBack }) => {
  const stats = useStatistics(currentMemberId);

  return (
    <SafeAreaView style={screenLayout.container}>
      <View style={screenLayout.header}>
        <AppBackButton onPress={onBack} />
        <Text style={screenLayout.headerTitle}>家計分析レポート</Text>
        <View style={statsScreenStyles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={screenLayout.scrollContent}>
        <View style={statsScreenStyles.topInfo}>
          <Text style={statsScreenStyles.headerSubtitle}>
            {currentMemberId === 1 ? 'PERSONAL REPORT' : 'FAMILY REPORT'}
          </Text>
          <View
            style={[
              statsScreenStyles.monthPickerContainer,
              stats.isWide
                ? statsScreenStyles.monthPickerContainerWide
                : statsScreenStyles.monthPickerContainerMobile,
            ]}
          >
            <AppSelect<string>
              selectedValue={stats.selectedMonth}
              onValueChange={stats.setSelectedMonth}
              options={stats.monthSelectOptions}
              includePlaceholder={false}
            />
          </View>
        </View>

        {stats.loading && !stats.data ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={statsScreenStyles.loadingIndicator}
          />
        ) : (
          <View style={stats.isWide ? statsScreenStyles.dashboardGrid : undefined}>
            <View style={stats.isWide ? statsScreenStyles.leftColumn : undefined}>
              <StatsSummaryCard data={stats.data} />

              <View style={cardStyles.section}>
                <Text style={statsScreenStyles.sectionTitle}>支出内訳</Text>
                <StatsPieChart chartData={stats.chartData} chartWidth={stats.chartWidth} />
              </View>

              <View style={cardStyles.section}>
                <Text style={statsScreenStyles.sectionTitle}>最新の解析レシート</Text>
                <StatsLatestReceiptPreview
                  receipt={stats.data?.latestReceipt}
                  imageSource={stats.latestReceiptImageSource}
                  onPress={() => stats.setMainModalVisible(true)}
                />
              </View>
            </View>

            <View style={stats.isWide ? statsScreenStyles.rightColumn : undefined}>
              <StatsTrendSection trend={stats.advancedData?.trend} />
              <StatsParetoSection pareto={stats.advancedData?.pareto} />
            </View>
          </View>
        )}
      </ScrollView>

      <AppModal
        visible={stats.isMainModalVisible}
        onRequestClose={() => stats.setMainModalVisible(false)}
        variant="sheet"
        sheetPresentation={stats.isWide ? 'wide' : 'fullscreen'}
        title="解析レシート詳細"
      >
        <ReceiptDetailComponent
          receipt={stats.data?.latestReceipt}
          categories={stats.allCategories}
          onCategoryChange={stats.handleCategoryChange}
          baseUrl={stats.BASE_URL}
          fullWidth={true}
          onSaveSuccess={stats.fetchData}
        />
      </AppModal>
    </SafeAreaView>
  );
};
