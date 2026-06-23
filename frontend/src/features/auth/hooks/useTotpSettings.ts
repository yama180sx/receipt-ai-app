import { useState } from 'react';
import { loginService } from '../../../services/loginService';
import { showAlert } from '../../../utils/alertMessage';

type UseTotpSettingsOptions = {
  onChanged: (enabled: boolean) => void;
};

export function useTotpSettings({ onChanged }: UseTotpSettingsOptions) {
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartEnable = async () => {
    setLoading(true);
    try {
      const setup = await loginService.startTotpSetupForUser();
      setSecret(setup.secret);
      setCode('');
    } catch (e: unknown) {
      showAlert('エラー', e instanceof Error ? e.message : 'セットアップに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEnable = async () => {
    if (!code.trim()) {
      showAlert('入力エラー', '6桁コードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      await loginService.enableTotpForUser(code);
      setSecret(null);
      setCode('');
      onChanged(true);
      showAlert('完了', '二要素認証を有効にしました。');
    } catch (e: unknown) {
      showAlert('エラー', e instanceof Error ? e.message : '有効化に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return {
    secret,
    code,
    setCode,
    loading,
    handleStartEnable,
    handleConfirmEnable,
  };
}
