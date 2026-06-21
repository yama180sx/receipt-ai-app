import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

import { adminApi, type PromptTemplate } from '../api';
import { getApiErrorMessage } from '../utils/apiError';
import { AppBackButton, AppButton, AppFormField, AppTextInput } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { theme } from '../theme';

interface PromptEditorScreenProps {
  onBack: () => void;
}

export const PromptEditorScreen: React.FC<PromptEditorScreenProps> = ({ onBack }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // フォーム用ステート
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formDomainHints, setFormDomainHints] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PROMPT_KEY = 'RECEIPT_ANALYSIS';

  // --- API連携関数 ---

  const fetchPrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.listPrompts();
      setTemplates((response.data ?? []).filter((p) => p.key === PROMPT_KEY));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleActivate = async (id: number) => {
    try {
      await adminApi.activatePrompt(id);
      fetchPrompts();
    } catch (err: unknown) {
      Alert.alert('エラー', getApiErrorMessage(err, 'デフォルトの切り替えに失敗しました。'));
    }
  };

  const handleDelete = async (id: number) => {
    const executeDelete = async () => {
      try {
        await adminApi.deletePrompt(id);
        fetchPrompts();
      } catch (err: unknown) {
        Alert.alert('エラー', getApiErrorMessage(err, '削除に失敗しました。'));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('本当にこのプロンプトを削除しますか？')) {
        executeDelete();
      }
    } else {
      Alert.alert('削除確認', '本当にこのプロンプトを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: executeDelete }
      ]);
    }
  };

  const handleSave = async () => {
    if (!formSystemPrompt.trim() || !formName.trim()) {
      Alert.alert('入力エラー', '名前とシステムプロンプトは必須です。');
      return;
    }

    let parsedHints = null;
    if (formDomainHints.trim()) {
      try {
        parsedHints = JSON.parse(formDomainHints);
      } catch (e) {
        Alert.alert('JSONエラー', 'Domain Hints の JSON 形式が不正です。');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isCreatingNew) {
        await adminApi.createPrompt({
          key: PROMPT_KEY,
          name: formName,
          description: formDesc,
          systemPrompt: formSystemPrompt,
          domainHints: parsedHints,
          isActive: false
        });
        if (Platform.OS !== 'web') Alert.alert('作成完了', '新しいプロンプトを作成しました。');
      } else if (editingTemplate && editingTemplate.id) {
        await adminApi.updatePrompt(editingTemplate.id, {
          name: formName,
          description: formDesc,
          systemPrompt: formSystemPrompt,
          domainHints: parsedHints,
        });
        if (Platform.OS !== 'web') Alert.alert('更新完了', 'プロンプトを更新しました。');
      } else {
        throw new Error('更新対象のプロンプトIDが見つかりません。');
      }
      
      setEditingTemplate(null);
      setIsCreatingNew(false);
      fetchPrompts();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '保存に失敗しました。'));
    } finally {
      setIsSaving(false);
    }
  };

  // --- UI制御関数 ---

  const openEditForm = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setIsCreatingNew(false);
    setFormName(template.name || '');
    setFormDesc(template.description || '');
    setFormSystemPrompt(template.systemPrompt);
    setFormDomainHints(template.domainHints ? JSON.stringify(template.domainHints, null, 2) : '');
  };

  const openCreateForm = () => {
    setEditingTemplate(null);
    setIsCreatingNew(true);
    setFormName('新規プロンプト');
    setFormDesc('');
    setFormSystemPrompt('');
    setFormDomainHints('');
  };

  const cancelForm = () => {
    setEditingTemplate(null);
    setIsCreatingNew(false);
    setError(null);
  };

  // --- レンダリング ---

  if (isLoading && templates.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>プロンプトを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>プロンプト管理</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* フォーム画面（編集 または 新規作成） */}
        {(editingTemplate || isCreatingNew) ? (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isCreatingNew ? '新規プロンプトの作成' : 'プロンプトの編集'}
              </Text>
              <AppButton
                title={BUTTON_LABELS.cancel}
                onPress={cancelForm}
                variant="ghost"
                size="sm"
              />
            </View>

            <AppFormField label="識別名 (管理用)">
              <AppTextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="例: テスト用(外税修正版)"
              />
            </AppFormField>

            <AppFormField label="System Prompt">
              <AppTextInput
                variant="textarea"
                style={styles.promptTextArea}
                value={formSystemPrompt}
                onChangeText={setFormSystemPrompt}
              />
            </AppFormField>

            <AppFormField label="Domain Hints (JSON形式)">
              <AppTextInput
                variant="textarea"
                style={styles.jsonTextArea}
                inputStyle={styles.jsonInputFont}
                value={formDomainHints}
                onChangeText={setFormDomainHints}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={`{\n  "gas_station": "ヒント..."\n}`}
              />
            </AppFormField>

            <AppButton
              title={BUTTON_LABELS.save}
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              fullWidth
              size="lg"
            />
          </View>
        ) : (
          /* 一覧表示画面 */
          <View>
            <AppButton
              title={`＋ ${BUTTON_LABELS.create}`}
              onPress={openCreateForm}
              variant="success"
              fullWidth
              style={{ marginBottom: 16 }}
            />

            {templates.map((tpl) => (
              <View key={tpl.id} style={[styles.card, tpl.isActive && styles.activeCard]}>
                <View style={styles.cardHeader}>
                  {/* ★修正: タイトル部分に flex: 1 を当てて右側の要素を押し出さないようにする */}
                  <View style={styles.titleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {tpl.name} <Text style={styles.versionText}>(v{tpl.version})</Text>
                    </Text>
                  </View>
                  {tpl.isActive && (
                    <View style={styles.badgeContainer}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>使用中</Text>
                      </View>
                    </View>
                  )}
                </View>
                {tpl.description && <Text style={styles.cardDesc}>{tpl.description}</Text>}
                
                <View style={styles.cardActions}>
                  {!tpl.isActive && (
                    <AppButton
                      title={BUTTON_LABELS.setDefault}
                      onPress={() => handleActivate(tpl.id)}
                      variant="outline"
                      size="sm"
                    />
                  )}
                  <AppButton
                    title={BUTTON_LABELS.edit}
                    onPress={() => openEditForm(tpl)}
                    size="sm"
                  />
                  {!tpl.isActive && (
                    <AppButton
                      title={BUTTON_LABELS.delete}
                      onPress={() => handleDelete(tpl.id)}
                      variant="danger"
                      size="sm"
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const adm = theme.colors.semantic.admin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adm.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: adm.surface, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: adm.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  contentContainer: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: adm.textMuted },
  errorContainer: { backgroundColor: adm.errorBg, padding: 12, borderRadius: 6, marginBottom: 16 },
  errorText: { color: adm.errorText },
  
  card: { backgroundColor: adm.surface, padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 2, borderColor: adm.border },
  activeCard: { borderColor: theme.colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleContainer: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: adm.textDark, lineHeight: 22 },
  versionText: { fontSize: 12, color: adm.textMuted, fontWeight: 'normal' },
  badgeContainer: { justifyContent: 'flex-start', paddingTop: 2 },
  badge: { backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: theme.colors.text.inverse, fontSize: 10, fontWeight: 'bold' },
  
  cardDesc: { fontSize: 13, color: adm.textMuted, marginBottom: 12 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },

  formContainer: { backgroundColor: adm.surface, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: adm.border },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  promptTextArea: { minHeight: 200 },
  jsonTextArea: { minHeight: 150 },
  jsonInputFont: { fontFamily: 'Courier' },
});