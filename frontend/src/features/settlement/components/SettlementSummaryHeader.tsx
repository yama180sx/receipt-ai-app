import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppBackButton, AppButton, AppSelect } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { theme } from '../../../theme';
import { useMonthSelectOptions } from '../../../utils/monthSelectOptions';

interface SettlementSummaryHeaderProps {
  isWide: boolean;
  selectedMonth: string;
  months: string[];
  onBack: () => void;
  onMonthChange: (month: string) => void;
  onOpenTransferModal: () => void;
}

export const SettlementSummaryHeader: React.FC<SettlementSummaryHeaderProps> = ({
  isWide,
  selectedMonth,
  months,
  onBack,
  onMonthChange,
  onOpenTransferModal,
}) => {
  const monthSelectOptions = useMonthSelectOptions(months, isWide);

  if (isWide) {
    return (
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>家族間精算サマリー</Text>
        <View style={styles.headerRight}>
          <View style={styles.monthPickerContainerWide}>
            <AppSelect<string>
              selectedValue={selectedMonth}
              onValueChange={onMonthChange}
              options={monthSelectOptions}
              includePlaceholder={false}
            />
          </View>
          <AppButton
            title={`＋ ${BUTTON_LABELS.recordTransfer}`}
            onPress={onOpenTransferModal}
            size="sm"
            style={styles.addTransferButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.header, styles.headerMobile]}>
      <View style={styles.headerTopRow}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitleMobile}>家族間精算サマリー</Text>
      </View>
      <View style={styles.monthPickerContainerMobile}>
        <AppSelect<string>
          selectedValue={selectedMonth}
          onValueChange={onMonthChange}
          options={monthSelectOptions}
          includePlaceholder={false}
        />
      </View>
      <AppButton
        title={`＋ ${BUTTON_LABELS.recordTransfer}`}
        onPress={onOpenTransferModal}
        size="sm"
        style={styles.addTransferButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  headerMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.main, flex: 1 },
  headerTitleMobile: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },
  addTransferButton: { paddingHorizontal: 4 },
  monthPickerContainerMobile: { width: '100%' },
  monthPickerContainerWide: { width: 140, justifyContent: 'center' },
});
