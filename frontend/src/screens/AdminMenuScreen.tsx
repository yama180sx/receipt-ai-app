import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppBackButton, AppListItem } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';

interface AdminMenuScreenProps {
  onBack: () => void;
  onGoToCategories: () => void;
  onGoToProductMaster: () => void;
  onGoToPromptEditor: () => void;
  onGoToAdminStats: () => void;
}

const adm = colors.semantic.admin;

export const AdminMenuScreen: React.FC<AdminMenuScreenProps> = ({
  onBack,
  onGoToCategories,
  onGoToProductMaster,
  onGoToPromptEditor,
  onGoToAdminStats,
}) => {
  return (
    <View style={[screenLayout.container, styles.containerAdmin]}>
      <View style={[screenLayout.header, styles.headerAdmin]}>
        <AppBackButton onPress={onBack} />
        <Text style={screenLayout.headerTitle}>管理者メニュー</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={screenLayout.scrollContent}>
        <View style={cardStyles.section}>
          <Text style={styles.sectionTitle}>マスタデータ管理</Text>

          <AppListItem
            variant="nav"
            onPress={onGoToCategories}
            title="カテゴリー設定"
            subtitle="支出カテゴリの追加・編集・色変更"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.icon.settings }]}>
                <Text>⚙️</Text>
              </View>
            }
          />

          <AppListItem
            variant="nav"
            onPress={onGoToProductMaster}
            title="学習マスタ管理"
            subtitle="商品名からの自動カテゴリ分類の修正"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.icon.product }]}>
                <Text>🧠</Text>
              </View>
            }
          />
        </View>

        <View style={cardStyles.section}>
          <Text style={styles.sectionTitle}>システム・AI設定</Text>

          <AppListItem
            variant="nav"
            onPress={onGoToPromptEditor}
            title="プロンプト・外税ヒント編集"
            subtitle="Geminiへの指示と店舗特有の計算ルール"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.icon.prompt }]}>
                <Text>📝</Text>
              </View>
            }
          />

          <AppListItem
            variant="nav"
            onPress={onGoToAdminStats}
            title="AIコスト統計"
            subtitle="API利用量と概算コストの確認"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.icon.stats }]}>
                <Text>📈</Text>
              </View>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  containerAdmin: { backgroundColor: adm.background },
  headerAdmin: { backgroundColor: adm.surface, borderBottomColor: adm.border },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.muted,
    marginBottom: spacing.md - 4,
    marginLeft: spacing.xs,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  },
});
