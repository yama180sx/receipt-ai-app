import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppBackButton, AppListItem } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';

interface AdminMenuScreenProps {
  onBack: () => void;
  onGoToPromptEditor: () => void;
  onGoToAdminStats: () => void;
  onGoToProductClassificationReclassification: () => void;
  onGoToStandardProductClassificationRules: () => void;
  onGoToAiBudget: () => void;
}

const adm = colors.semantic.admin;

export const AdminMenuScreen: React.FC<AdminMenuScreenProps> = ({
  onBack,
  onGoToPromptEditor,
  onGoToAdminStats,
  onGoToProductClassificationReclassification,
  onGoToStandardProductClassificationRules,
  onGoToAiBudget,
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
          <Text style={styles.sectionTitle}>システム・AI設定</Text>

          <AppListItem
            variant="nav" onPress={onGoToAiBudget} title="全体AI予算・通知管理"
            subtitle="予算、通知先、試験通知、配送状況を管理"
            left={<View style={[styles.iconWrapper, { backgroundColor: colors.semantic.icon.stats }]}><Text>🔔</Text></View>}
          />
          <AppListItem
            variant="nav"
            onPress={onGoToStandardProductClassificationRules}
            title="標準分類ルール管理"
            subtitle="全世帯共通のキーワード分類を管理"
            left={<View style={[styles.iconWrapper, { backgroundColor: colors.semantic.icon.prompt }]}><Text>🏷️</Text></View>}
          />

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
            onPress={onGoToProductClassificationReclassification}
            title="既存明細の再分類"
            subtitle="最新の辞書で未分類・要確認明細を再評価"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.warning.bg }]}>
                <Text>🔄</Text>
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
