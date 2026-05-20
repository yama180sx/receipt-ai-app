import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import apiClient from '../utils/apiClient';
import { theme } from '../theme';

interface PromptTemplate {
  key: string;
  systemPrompt: string;
  domainHints: Record<string, any>;
  isActive: boolean;
  version: number;
}

interface PromptEditorScreenProps {
  onBack: () => void;
}

export const PromptEditorScreen: React.FC<PromptEditorScreenProps> = ({ onBack }) => {
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [domainHintsStr, setDomainHintsStr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PROMPT_KEY = 'RECEIPT_ANALYSIS';

  const fetchPromptTemplate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ success: boolean; data: PromptTemplate[] }>('/admin/prompts');
      
      if (response.data.success && response.data.data) {
        const target = response.data.data.find((p) => p.key === PROMPT_KEY);
        if (target) {
          setTemplate(target);
          setSystemPrompt(target.systemPrompt);
          setDomainHintsStr(JSON.stringify(target.domainHints, null, 2));
        } else {
          setError(`キー "${PROMPT_KEY}" のテンプレートが見つかりません。`);
        }
      } else {
        setError('データの取得に失敗しました。');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || '通信エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromptTemplate();
  }, []);

  const handleSave = async () => {
    if (!template) return;

    setError(null);
    let parsedHints: Record<string, any>;

    try {
      parsedHints = JSON.parse(domainHintsStr);
    } catch (e) {
      Alert.alert('JSONパースエラー', 'Domain Hints の JSON 形式が不正です。構文を確認してください。');
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.patch(`/admin/prompts`, {
        key: PROMPT_KEY,
        systemPrompt,
        domainHints: parsedHints,
      });

      if (response.status === 200) {
        Alert.alert('保存完了', `プロンプトをバージョン ${template.version + 1} に更新しました。`);
        fetchPromptTemplate();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err.message || '保存に失敗しました。';
      setError(errMsg);
      Alert.alert('保存エラー', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>プロンプトを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロンプト・チューニング</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {template && (
          <View style={styles.infoBadge}>
            <Text style={styles.infoText}>Target Key: {template.key}</Text>
            <Text style={styles.infoText}>Current Version: v{template.version}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>System Prompt (ベース指示 / Chain of Thought規則)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Geminiへのシステムプロンプトを入力してください"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Domain Hints (業態別レジストリ - JSON形式)</Text>
          <TextInput
            style={[styles.input, styles.jsonArea]}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            value={domainHintsStr}
            onChangeText={setDomainHintsStr}
            placeholder={`{\n  "gas_station": "ガソリンスタンドのヒント...",\n  "pharmacy": "薬局のヒント..."\n}`}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>更新を保存 (反映)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: { width: 60, paddingVertical: 8 },
  backButtonText: { color: theme.colors.primary, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  infoBadge: {
    backgroundColor: '#E9ECEF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6C757D',
  },
  errorContainer: {
    backgroundColor: '#F8D7DA',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5C2C7',
  },
  errorText: {
    color: '#842029',
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#212529',
  },
  textArea: {
    height: 240,
    fontFamily: 'System',
  },
  jsonArea: {
    height: 200,
    fontFamily: 'Courier', 
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#A2C4FF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});