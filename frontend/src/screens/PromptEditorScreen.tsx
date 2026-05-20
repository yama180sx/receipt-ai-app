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

// 共通APIクライアント（環境に合わせて適宜インポートパスを調整してください）
// 認証ヘッダー等は共通クライアント側で設定されている前提です
import apiClient from '../utils/apiClient';

interface PromptTemplate {
  key: string;
  systemPrompt: string;
  domainHints: Record<string, any>;
  isActive: boolean;
  version: number;
}

export const PromptEditorScreen: React.FC = () => {
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [domainHintsStr, setDomainHintsStr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PROMPT_KEY = 'RECEIPT_ANALYSIS';

  // 1. プロンプトテンプレートの取得
  const fetchPromptTemplate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // adminRoutes: /api/admin/prompts (GET)
      const response = await apiClient.get<{ success: boolean; data: PromptTemplate[] }>('/admin/prompts');
      
      if (response.data.success && response.data.data) {
        // キーが RECEIPT_ANALYSIS のものを抽出
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

  // 2. 編集内容の保存
  const handleSave = async () => {
    if (!template) return;

    setError(null);
    let parsedHints: Record<string, any>;

    // domainHints (JSON) のパースバリデーション
    try {
      parsedHints = JSON.parse(domainHintsStr);
    } catch (e) {
      Alert.alert('JSONパースエラー', 'Domain Hints の JSON 形式が不正です。構文を確認してください。');
      return;
    }

    setIsSaving(true);
    try {
      // adminRoutes: /api/admin/prompts (PATCH)
      // tenantMiddleware を通さないため、全世帯共通のシステム設定として更新
      const response = await apiClient.patch(`/admin/prompts`, {
        key: PROMPT_KEY,
        systemPrompt,
        domainHints: parsedHints,
      });

      if (response.status === 200) {
        Alert.alert('保存完了', `プロンプトをバージョン ${template.version + 1} に更新しました。`);
        fetchPromptTemplate(); // 最新状態（バージョン等）を再取得
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>プロンプト・チューニング (Admin UI)</Text>
      
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
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
    fontFamily: 'Courier', // 固定ピッチフォント（Web/iOS環境を考慮、Androidはフォールバック）
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