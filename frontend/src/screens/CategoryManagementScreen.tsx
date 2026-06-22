import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Platform } from 'react-native';
import { AppBackButton, AppButton, AppListColorDot, AppListItem, AppTextInput } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { useCategoryManagement } from '../features/category';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';

export const CategoryManagementScreen = ({
  onBack,
  currentMemberId,
}: {
  onBack: () => void;
  currentMemberId: number | null;
}) => {
  const category = useCategoryManagement({ currentMemberId });

  return (
    <View style={[screenLayout.container, styles.containerCategory]}>
      <View style={[screenLayout.header, styles.headerCategory]}>
        <AppBackButton onPress={onBack} />
        <Text style={[typography.h1, styles.titleCategory]}>カテゴリー設定</Text>
      </View>

      <View style={[cardStyles.section, styles.inputSection]}>
        <AppTextInput
          style={styles.nameInput}
          value={category.newName}
          onChangeText={category.setNewName}
          placeholder="新しいカテゴリー"
        />
        <AppButton title={BUTTON_LABELS.add} onPress={category.addCategory} size="md" />
      </View>

      <AppButton
        title="🪄 キーワード自動最適化"
        onPress={category.handleOptimize}
        loading={category.optimizing}
        disabled={category.optimizing}
        fullWidth
        size="md"
        style={{ backgroundColor: colors.semantic.category.optimize, marginBottom: spacing.lg }}
      />

      {!currentMemberId ? (
        <Text style={styles.emptyText}>メンバーを選択してください</Text>
      ) : category.loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={category.categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AppListItem
              title={item.name}
              left={<AppListColorDot color={item.color ?? colors.semantic.placeholder.badge} />}
              right={
                <AppButton
                  title={BUTTON_LABELS.delete}
                  onPress={() => category.deleteCategory(item.id)}
                  variant="dangerFilled"
                  size="sm"
                />
              }
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerCategory: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
  },
  headerCategory: { borderBottomWidth: 0, marginBottom: spacing.lg, paddingHorizontal: 0, paddingVertical: 0 },
  titleCategory: { marginLeft: spacing.sm, flex: 1, color: colors.text.main },
  inputSection: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm + 2, alignItems: 'center' },
  nameInput: { flex: 1 },
  list: { paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 30, color: colors.text.muted },
});
