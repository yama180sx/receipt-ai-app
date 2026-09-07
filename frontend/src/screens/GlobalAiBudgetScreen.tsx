import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { adminApi, type AiBudgetNotificationDelivery, type UpdateGlobalAiBudgetInput } from '../api/adminApi';
import { AppBackButton, AppButton, AppFormField, AppTextInput } from '../components/ui';
import { showApiErrorAlert } from '../utils/apiError';
import { showAlert } from '../utils/alertMessage';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';

const defaultForm: UpdateGlobalAiBudgetInput = { isEnabled: false, monthlyBudgetJpy: 1000, warningPercent: 50, criticalPercent: 80, stopPercent: 100, notifyDiscord: true, notificationEmails: [], reason: '' };

export function GlobalAiBudgetScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState(defaultForm);
  const [emails, setEmails] = useState('');
  const [deliveries, setDeliveries] = useState<AiBudgetNotificationDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [budget, history] = await Promise.all([adminApi.getGlobalAiBudget(), adminApi.listGlobalAiBudgetNotificationDeliveries()]);
      const setting = budget.data.setting;
      if (setting) { setForm({ ...defaultForm, ...setting, monthlyBudgetJpy: Number(setting.monthlyBudgetJpy ?? 1000), reason: '' }); setEmails(setting.notificationEmails.join('\n')); }
      setDeliveries(history.data ?? []);
    } catch (error) { showApiErrorAlert('AI予算設定の取得に失敗しました', error); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const number = (key: 'monthlyBudgetJpy' | 'warningPercent' | 'criticalPercent' | 'stopPercent', value: string) => setForm({ ...form, [key]: Number(value) });
  const save = async () => {
    const input = { ...form, notificationEmails: emails.split(/[,\n]/).map((value) => value.trim()).filter(Boolean) };
    try { await adminApi.updateGlobalAiBudget(input); showAlert('保存しました', 'AI予算と通知設定を更新しました。'); await load(); } catch (error) { showApiErrorAlert('保存に失敗しました', error); }
  };
  const test = async (channels: Array<'DISCORD' | 'EMAIL'>) => { try { await adminApi.testGlobalAiBudgetNotification(channels); showAlert('受付済み', '試験通知を受け付けました。'); await load(); } catch (error) { showApiErrorAlert('試験通知に失敗しました', error); } };
  if (loading) return <View style={screenLayout.container}><Text>読み込み中...</Text></View>;
  return <ScrollView contentContainerStyle={screenLayout.scrollContent}>
    <View style={screenLayout.header}><AppBackButton onPress={onBack} /><Text style={screenLayout.headerTitle}>全体AI予算・通知管理</Text></View>
    <AppFormField label="月額予算（円）"><AppTextInput value={String(form.monthlyBudgetJpy)} keyboardType="numeric" onChangeText={(value) => number('monthlyBudgetJpy', value)} /></AppFormField>
    <AppFormField label="警告しきい値（%）"><AppTextInput value={String(form.warningPercent)} keyboardType="numeric" onChangeText={(value) => number('warningPercent', value)} /></AppFormField>
    <AppFormField label="重要しきい値（%）"><AppTextInput value={String(form.criticalPercent)} keyboardType="numeric" onChangeText={(value) => number('criticalPercent', value)} /></AppFormField>
    <AppFormField label="停止しきい値（%）"><AppTextInput value={String(form.stopPercent)} keyboardType="numeric" onChangeText={(value) => number('stopPercent', value)} /></AppFormField>
    <AppFormField label="メール通知先（1行またはカンマ区切り）"><AppTextInput variant="textarea" value={emails} onChangeText={setEmails} autoCapitalize="none" /></AppFormField>
    <AppFormField label="変更理由"><AppTextInput value={form.reason} onChangeText={(reason) => setForm({ ...form, reason })} /></AppFormField>
    <AppButton title={form.isEnabled ? '予算停止機能を有効' : '予算停止機能を無効'} onPress={() => setForm({ ...form, isEnabled: !form.isEnabled })} variant="outline" fullWidth />
    <AppButton title={form.notifyDiscord ? 'Discord通知を有効' : 'Discord通知を無効'} onPress={() => setForm({ ...form, notifyDiscord: !form.notifyDiscord })} variant="outline" fullWidth />
    <AppButton title="設定を保存" onPress={save} fullWidth />
    <AppButton title="Discordへ試験通知" onPress={() => test(['DISCORD'])} variant="outline" fullWidth />
    <AppButton title="メールへ試験通知" onPress={() => test(['EMAIL'])} variant="outline" fullWidth />
    <Text style={screenLayout.headerTitle}>通知配送履歴</Text>
    {deliveries.length === 0 ? <Text>配送履歴はありません。</Text> : deliveries.map((delivery) => <View key={delivery.id} style={cardStyles.listCard}><Text>{delivery.kind === 'TEST' ? '試験通知' : `${delivery.month} ${delivery.thresholdPercent}%`}</Text><Text>{delivery.channel === 'DISCORD' ? 'Discord' : delivery.recipient} ／ {delivery.status} ／ {delivery.attempts}回</Text>{delivery.lastError ? <Text>最終エラー: {delivery.lastError}</Text> : null}</View>)}
  </ScrollView>;
}
