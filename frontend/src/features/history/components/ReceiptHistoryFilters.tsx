import React from 'react';
import { View } from 'react-native';
import { AppSelect, AppTextInput } from '../../../components/ui';
import type { AppSelectOption } from '../../../components/ui/AppSelect';
import { receiptHistoryStyles as styles } from '../styles/receiptHistoryStyles';

type ReceiptHistoryFiltersProps = {
  isWide: boolean;
  searchQuery: string;
  selectedMonth: string;
  selectedMember: string;
  monthSelectOptions: AppSelectOption<string>[];
  memberSelectOptions: AppSelectOption<string>[];
  onSearchQueryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onMemberChange: (value: string) => void;
};

export function ReceiptHistoryFilters({
  isWide,
  searchQuery,
  selectedMonth,
  selectedMember,
  monthSelectOptions,
  memberSelectOptions,
  onSearchQueryChange,
  onMonthChange,
  onMemberChange,
}: ReceiptHistoryFiltersProps) {
  return (
    <View style={[styles.filterContainer, isWide ? styles.filterContainerWide : styles.filterContainerMobile]}>
      <View style={[styles.filterSelectWrap, isWide && styles.filterSelectWrapWide]}>
        <AppTextInput
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder="店舗名・商品名で検索"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={[styles.filterSelectWrap, isWide && styles.filterSelectWrapWide]}>
        <AppSelect<string>
          selectedValue={selectedMonth}
          onValueChange={onMonthChange}
          options={monthSelectOptions}
          placeholder="全期間"
          placeholderValue=""
        />
      </View>
      <View style={[styles.filterSelectWrap, isWide && styles.filterSelectWrapWide]}>
        <AppSelect<string>
          selectedValue={selectedMember}
          onValueChange={onMemberChange}
          options={memberSelectOptions}
          placeholder="世帯全体"
          placeholderValue=""
        />
      </View>
    </View>
  );
}
