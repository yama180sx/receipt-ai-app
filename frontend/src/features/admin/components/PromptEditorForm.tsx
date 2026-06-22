import React from 'react';
import { View, Text } from 'react-native';
import { AppButton, AppFormField, AppTextInput } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { cardStyles } from '../../../theme/cardStyles';
import type { PromptEditorFormState } from '../hooks/usePromptEditor';
import { promptEditorStyles as styles } from '../styles/promptEditorStyles';

type Props = {
  isCreatingNew: boolean;
  form: PromptEditorFormState;
  isSaving: boolean;
  onFieldChange: <K extends keyof PromptEditorFormState>(
    key: K,
    value: PromptEditorFormState[K]
  ) => void;
  onCancel: () => void;
  onSave: () => void;
};

export const PromptEditorForm: React.FC<Props> = ({
  isCreatingNew,
  form,
  isSaving,
  onFieldChange,
  onCancel,
  onSave,
}) => (
  <View style={[cardStyles.listCard, styles.formContainer]}>
    <View style={styles.formHeader}>
      <Text style={styles.formTitle}>
        {isCreatingNew ? '新規プロンプトの作成' : 'プロンプトの編集'}
      </Text>
      <AppButton title={BUTTON_LABELS.cancel} onPress={onCancel} variant="ghost" size="sm" />
    </View>

    <AppFormField label="識別名 (管理用)">
      <AppTextInput
        value={form.name}
        onChangeText={(value) => onFieldChange('name', value)}
        placeholder="例: テスト用(外税修正版)"
      />
    </AppFormField>

    <AppFormField label="System Prompt">
      <AppTextInput
        variant="textarea"
        style={styles.promptTextArea}
        value={form.systemPrompt}
        onChangeText={(value) => onFieldChange('systemPrompt', value)}
      />
    </AppFormField>

    <AppFormField label="Domain Hints (JSON形式)">
      <AppTextInput
        variant="textarea"
        style={styles.jsonTextArea}
        inputStyle={styles.jsonInputFont}
        value={form.domainHints}
        onChangeText={(value) => onFieldChange('domainHints', value)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={`{\n  "gas_station": "ヒント..."\n}`}
      />
    </AppFormField>

    <AppButton
      title={BUTTON_LABELS.save}
      onPress={onSave}
      loading={isSaving}
      disabled={isSaving}
      fullWidth
      size="lg"
    />
  </View>
);
