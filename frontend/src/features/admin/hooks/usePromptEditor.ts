import { useState, useEffect, useCallback } from 'react';
import { adminApi, type PromptTemplate } from '../../../api';
import { getApiErrorMessage } from '../../../utils/apiError';
import { showAlert } from '../../../utils/alertMessage';
import { showConfirmDialog } from '../../../utils/confirmDialog';

const PROMPT_KEY = 'RECEIPT_ANALYSIS';

export type PromptEditorFormState = {
  name: string;
  description: string;
  systemPrompt: string;
  domainHints: string;
};

const emptyForm = (): PromptEditorFormState => ({
  name: '',
  description: '',
  systemPrompt: '',
  domainHints: '',
});

export function usePromptEditor() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [form, setForm] = useState<PromptEditorFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormVisible = editingTemplate !== null || isCreatingNew;

  const fetchPrompts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void fetchPrompts();
  }, [fetchPrompts]);

  const handleActivate = useCallback(
    async (id: number) => {
      try {
        await adminApi.activatePrompt(id);
        await fetchPrompts();
      } catch (err: unknown) {
        showAlert('エラー', getApiErrorMessage(err, 'デフォルトの切り替えに失敗しました。'));
      }
    },
    [fetchPrompts]
  );

  const handleDelete = useCallback(
    (id: number) => {
      const executeDelete = async () => {
        try {
          await adminApi.deletePrompt(id);
          await fetchPrompts();
        } catch (err: unknown) {
          showAlert('エラー', getApiErrorMessage(err, '削除に失敗しました。'));
        }
      };

      showConfirmDialog('削除確認', '本当にこのプロンプトを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: executeDelete },
      ]);
    },
    [fetchPrompts]
  );

  const openEditForm = useCallback((template: PromptTemplate) => {
    setEditingTemplate(template);
    setIsCreatingNew(false);
    setForm({
      name: template.name || '',
      description: template.description || '',
      systemPrompt: template.systemPrompt,
      domainHints: template.domainHints
        ? JSON.stringify(template.domainHints, null, 2)
        : '',
    });
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingTemplate(null);
    setIsCreatingNew(true);
    setForm({
      ...emptyForm(),
      name: '新規プロンプト',
    });
  }, []);

  const cancelForm = useCallback(() => {
    setEditingTemplate(null);
    setIsCreatingNew(false);
    setError(null);
  }, []);

  const updateFormField = useCallback(
    <K extends keyof PromptEditorFormState>(key: K, value: PromptEditorFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form.systemPrompt.trim() || !form.name.trim()) {
      showAlert('入力エラー', '名前とシステムプロンプトは必須です。');
      return;
    }

    let parsedHints: unknown = null;
    if (form.domainHints.trim()) {
      try {
        parsedHints = JSON.parse(form.domainHints);
      } catch {
        showAlert('JSONエラー', 'Domain Hints の JSON 形式が不正です。');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isCreatingNew) {
        await adminApi.createPrompt({
          key: PROMPT_KEY,
          name: form.name,
          description: form.description,
          systemPrompt: form.systemPrompt,
          domainHints: parsedHints,
          isActive: false,
        });
        showAlert('作成完了', '新しいプロンプトを作成しました。');
      } else if (editingTemplate?.id) {
        await adminApi.updatePrompt(editingTemplate.id, {
          name: form.name,
          description: form.description,
          systemPrompt: form.systemPrompt,
          domainHints: parsedHints,
        });
        showAlert('更新完了', 'プロンプトを更新しました。');
      } else {
        throw new Error('更新対象のプロンプトIDが見つかりません。');
      }

      setEditingTemplate(null);
      setIsCreatingNew(false);
      await fetchPrompts();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '保存に失敗しました。'));
    } finally {
      setIsSaving(false);
    }
  }, [editingTemplate, fetchPrompts, form, isCreatingNew]);

  return {
    templates,
    form,
    isLoading,
    isSaving,
    error,
    isFormVisible,
    isCreatingNew,
    updateFormField,
    openEditForm,
    openCreateForm,
    cancelForm,
    handleSave,
    handleActivate,
    handleDelete,
  };
}
