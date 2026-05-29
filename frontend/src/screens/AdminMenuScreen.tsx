import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppBackButton } from '../components/ui';
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
          
          <TouchableOpacity style={styles.settingsCard} onPress={onGoToCategories}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.settings }]}><Text>⚙️</Text></View>
            <View style={styles.textWrapper}>
              <Text style={styles.cardTitle}>カテゴリー設定</Text>
              <Text style={styles.cardDesc}>支出カテゴリの追加・編集・色変更</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard} onPress={onGoToProductMaster}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.product }]}><Text>🧠</Text></View>
            <View style={styles.textWrapper}>
              <Text style={styles.cardTitle}>学習マスタ管理</Text>
              <Text style={styles.cardDesc}>商品名からの自動カテゴリ分類の修正</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>システム・AI設定</Text>
          
          <TouchableOpacity style={styles.settingsCard} onPress={onGoToPromptEditor}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.prompt }]}><Text>📝</Text></View>
            <View style={styles.textWrapper}>
              <Text style={styles.cardTitle}>プロンプト・外税ヒント編集</Text>
              <Text style={styles.cardDesc}>Geminiへの指示と店舗特有の計算ルール</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard} onPress={onGoToAdminStats}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.semantic.icon.stats }]}><Text>📈</Text></View>
            <View style={styles.textWrapper}>
              <Text style={styles.cardTitle}>AIコスト統計</Text>
              <Text style={styles.cardDesc}>API利用量と概算コストの確認</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
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
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adm.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: adm.border,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textWrapper: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.main, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: theme.colors.text.muted },
  arrow: { fontSize: 24, color: adm.arrow },
});