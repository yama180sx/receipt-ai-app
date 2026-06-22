import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { screenLayout } from '../theme/screenLayout';
import { useIsWideLayout } from '../hooks/useIsWideLayout';
import {
  useSettlementSummary,
  SettlementSummaryHeader,
  SettlementMemberCards,
  SettlementDetailTable,
  SettlementTransferHistory,
  SettlementTransferModal,
} from '../features/settlement';
import { hasNegativeAmountSign } from '../utils/parsePositiveYenAmount';

interface SettlementSummaryScreenProps {
  onBack: () => void;
}

export const SettlementSummaryScreen: React.FC<SettlementSummaryScreenProps> = ({
  onBack,
}) => {
  const isWide = useIsWideLayout();
  const settlement = useSettlementSummary();

  const handleTransferAmountChange = (value: string) => {
    if (hasNegativeAmountSign(value)) {
      settlement.setTransferFieldErrors((prev) => ({
        ...prev,
        amount: '金額は0より大きい値を入力してください',
      }));
      return;
    }
    settlement.setTransferAmount(value.replace(/[^0-9]/g, ''));
    if (settlement.transferFieldErrors.amount) {
      settlement.setTransferFieldErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  return (
    <View style={screenLayout.container}>
      <SettlementSummaryHeader
        isWide={isWide}
        selectedMonth={settlement.selectedMonth}
        months={settlement.months}
        onBack={onBack}
        onMonthChange={settlement.setSelectedMonth}
        onOpenTransferModal={settlement.openTransferModal}
      />

      {settlement.loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[screenLayout.scrollContent, styles.scrollContentSettlement]}
        >
          <SettlementMemberCards
            summaryData={settlement.summaryData}
            isWide={isWide}
          />
          <SettlementDetailTable summaryData={settlement.summaryData} />
          <SettlementTransferHistory
            selectedMonth={settlement.selectedMonth}
            transfers={settlement.sortedTransfers}
            memberNameById={settlement.memberNameById}
            cancellingTransferId={settlement.cancellingTransferId}
            onCancelTransfer={settlement.handleCancelTransfer}
          />
        </ScrollView>
      )}

      <SettlementTransferModal
        visible={settlement.isTransferModalVisible}
        memberSelectOptions={settlement.memberSelectOptions}
        transferFrom={settlement.transferFrom}
        transferTo={settlement.transferTo}
        transferAmount={settlement.transferAmount}
        transferFieldErrors={settlement.transferFieldErrors}
        isSubmitting={settlement.isSubmitting}
        onClose={settlement.closeTransferModal}
        onSubmit={() => void settlement.handleTransferSubmit()}
        onTransferFromChange={settlement.setTransferFrom}
        onTransferToChange={settlement.setTransferTo}
        onTransferAmountChange={handleTransferAmountChange}
        onClearFieldError={(field) =>
          settlement.setTransferFieldErrors((prev) => ({ ...prev, [field]: undefined }))
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { flex: 1 },
  scrollContentSettlement: { paddingBottom: 40 },
});
