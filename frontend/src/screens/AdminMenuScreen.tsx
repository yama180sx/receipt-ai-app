import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppBackButton, AppListItem } from '../components/ui';
import { theme } from '../theme';

interface AdminMenuScreenProps {
  onBack: () => void;
  onGoToCategories: () => void;
  onGoToProductMaster: () => void;
  onGoToPromptEditor: () => void;
  onGoToAdminStats: () => void;
}

export const AdminMenuScreen: React.FC<AdminMenuScreenProps> = ({
  onBack,
  onGoToCategories,
  onGoToProductMaster,
  onGoToPromptEditor,
  onGoToAdminStats
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>管理者メニュー</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>マスタデータ管理</Text>
          
          <AppListItem
            variant="nav"
            onPress={onGoToCategories}
            title="カテゴリー設定"
            subtitle="支出カテゴリの追加・編集・色変更"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.settings }]}>
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
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.product }]}>
                <Text>🧠</Text>
              </View>
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>システム・AI設定</Text>
          
          <AppListItem
            variant="nav"
            onPress={onGoToPromptEditor}
            title="プロンプト・外税ヒント編集"
            subtitle="Geminiへの指示と店舗特有の計算ルール"
            left={
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.prompt }]}>
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
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.stats }]}>
                <Text>📈</Text>
              </View>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

const adm = theme.colors.semantic.admin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adm.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: adm.surface,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: adm.border,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text.muted, marginBottom: 12, marginLeft: 4 },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  },
});