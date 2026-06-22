import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';

import { AppBackButton } from '../components/ui';
import { colors } from '../theme/colors';
import { screenLayout } from '../theme/screenLayout';
import {
  usePromptEditor,
  PromptEditorForm,
  PromptEditorList,
} from '../features/admin';
import { promptEditorStyles as styles } from '../features/admin/styles/promptEditorStyles';

interface PromptEditorScreenProps {
  onBack: () => void;
}

export const PromptEditorScreen: React.FC<PromptEditorScreenProps> = ({ onBack }) => {
  const editor = usePromptEditor();

  if (editor.isLoading && editor.templates.length === 0) {
    return (
      <View style={[screenLayout.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>プロンプトを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[screenLayout.container, styles.containerAdmin]}>
      <View style={[screenLayout.header, styles.headerAdmin]}>
        <AppBackButton onPress={onBack} />
        <Text style={screenLayout.headerTitle}>プロンプト管理</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={[screenLayout.scrollContent, styles.contentContainer]}>
        {editor.error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{editor.error}</Text>
          </View>
        ) : null}

        {editor.isFormVisible ? (
          <PromptEditorForm
            isCreatingNew={editor.isCreatingNew}
            form={editor.form}
            isSaving={editor.isSaving}
            onFieldChange={editor.updateFormField}
            onCancel={editor.cancelForm}
            onSave={() => void editor.handleSave()}
          />
        ) : (
          <PromptEditorList
            templates={editor.templates}
            onCreate={editor.openCreateForm}
            onEdit={editor.openEditForm}
            onActivate={(id) => void editor.handleActivate(id)}
            onDelete={editor.handleDelete}
          />
        )}
      </ScrollView>
    </View>
  );
};
