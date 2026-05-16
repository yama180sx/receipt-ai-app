import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface PromptTemplate {
  key: string;
  systemPrompt: string;
  domainHints: string; // バックエンドからJSON文字列、またはオブジェクトで返却される想定
  description: string | null;
  version: number;
}

// 環境に合わせてベースURLを調整してください
const API_BASE_URL = Platform.OS === 'web' ? '/api/admin' : 'http://YOUR_SERVER_IP:3000/api/admin';
const PROMPT_KEY = 'RECEIPT_ANALYSIS';

export default function PromptEditorScreen() {
  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [domainHintsStr, setDomainHintsStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 1. プロンプトデータの取得
  const fetchPromptTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/prompts`);
      if (!response.ok) throw new Error('プロンプト一覧の取得に失敗しました');
      
      const data: PromptTemplate[] = await response.json();
      const target = data.find((p) => p.key === PROMPT_KEY);
      
      if (!target) {
        throw new Error(`${PROMPT_KEY} のテンプレートが見つかりません`);
      }

      setPrompt(target);
      setSystemPrompt(target.systemPrompt);
      
      // domainHints がオブジェクトの場合は整形文字列に、文字列ならそのままセット
      const hints = typeof target.domainHints === 'object' 
        ? JSON.stringify(target.domainHints, null, 2) 
        : target.domainHints;
      setDomainHintsStr(hints || '{}');
      setJsonError(null);
    } catch (error: any) {
      alertOrAlert('エラー', error.message || 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromptTemplate();
  }, []);

  // domainHintsのリアルタイムJSONチェック
  const handleJsonChange = (text: string) => {
    setDomainHintsStr(text);
    if (!text.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`無効なJSON形式です: ${e.message}`);
    }
  };

  // 2. PATCHリクエストによる更新保存
  const handleSave = async () => {
    if (!prompt) return;
    if (jsonError) {
      alertOrAlert('エラー', 'domainHintsのJSON形式を修正してください。');
      return;
    }

    let parsedHints;
    try {
      parsedHints = JSON.parse(domainHintsStr || '{}');
    } catch (e) {
      alertOrAlert('エラー', 'domainHintsのJSONパースに失敗しました。');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/prompts/${PROMPT_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          domainHints: parsedHints,
        }),
      });

      if (!response.ok) throw new Error('プロンプトの更新に失敗しました');
      const updated: PromptTemplate = await response.json();

      alertOrAlert('成功', `プロンプトを更新しました (現在のバージョン: v${updated.version})`);
      
      setPrompt(updated);
      setSystemPrompt(updated.systemPrompt);
      setDomainHintsStr(typeof updated.domainHints === 'object' ? JSON.stringify(updated.domainHints, null, 2) : updated.domainHints);
    } catch (error: any) {
      alertOrAlert('エラー', error.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // Web環境(ブラウザ)とネイティブ双方でのアラート対応フォールバック
  const alertOrAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>プロンプト読込中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Prompt Editor ({PROMPT_KEY})</Text>
          {prompt && <Text style={styles.versionBadge}>Version: {prompt.version}</Text>}
        </View>
        <Text style={styles.description}>{prompt?.description || 'レシート解析用コアプロンプトの設定'}</Text>

        <View style={styles.workspace}>
          {/* システムプロンプト編集エリア */}
          <View style={styles.editorBox}>
            <Text style={styles.label}>System Prompt</Text>
            <TextInput
              style={[styles.textArea, styles.systemPromptArea]}
              multiline
              textAlignVertical="top"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* ドメインヒント (JSON) 編集エリア */}
          <View style={styles.editorBox}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Domain Hints (JSON形式)</Text>
              {jsonError && <Text style={styles.errorText}>⚠️ {jsonError}</Text>}
            </View>
            <TextInput
              style={[styles.textArea, styles.jsonArea, jsonError ? styles.inputError : null]}
              multiline
              textAlignVertical="top"
              value={domainHintsStr}
              onChangeText={handleJsonChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (saving || !!jsonError) && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving || !!jsonError}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>プロンプトを適用（バージョンを更新）</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollContainer: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E' },
  versionBadge: { backgroundColor: '#E5F1FF', color: '#007AFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold' },
  description: { fontSize: 14, color: '#666', marginBottom: 20 },
  workspace: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 20, marginBottom: 20 },
  editorBox: { flex: 1, minWidth: Platform.OS === 'web' ? '45%' : '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#3A3A3C', marginBottom: 6 },
  errorText: { fontSize: 12, color: '#FF3B30', flex: 1, textAlign: 'right', marginLeft: 10 },
  textArea: { borderWidth: 1, borderColor: '#C7C7CC', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#FFF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  systemPromptArea: { minHeight: 450 },
  jsonArea: { minHeight: 450, color: '#004080' },
  inputError: { borderColor: '#FF3B30', backgroundColor: '#FFF9F9' },
  footer: { alignItems: 'flex-end', marginTop: 10 },
  saveButton: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  disabledButton: { backgroundColor: '#A9A9A9' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});