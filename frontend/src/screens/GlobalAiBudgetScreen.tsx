import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminApi, type AiBudgetNotificationDelivery, type GlobalAiBudgetManager, type GlobalAiBudgetManagerCandidate, type UpdateGlobalAiBudgetInput } from '../api/adminApi';
import { AppBackButton, AppButton, AppFormField, AppSelect, AppTextInput } from '../components/ui';
import { showApiErrorAlert } from '../utils/apiError';
import { showAlert } from '../utils/alertMessage';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { showConfirmDialog } from '../utils/confirmDialog';

const defaultForm: UpdateGlobalAiBudgetInput = { isEnabled: false, monthlyBudgetJpy: 1000, warningPercent: 50, criticalPercent: 80, stopPercent: 100, notifyDiscord: true, notificationEmails: [], reason: '' };

export function GlobalAiBudgetScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState(defaultForm);
  const [emails, setEmails] = useState('');
  const [deliveries, setDeliveries] = useState<AiBudgetNotificationDelivery[]>([]);
  const [managers, setManagers] = useState<GlobalAiBudgetManager[]>([]);
  const [candidates, setCandidates] = useState<GlobalAiBudgetManagerCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [managerReason, setManagerReason] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [budget, history, managerList, candidateList] = await Promise.all([adminApi.getGlobalAiBudget(), adminApi.listGlobalAiBudgetNotificationDeliveries(), adminApi.listGlobalAiBudgetManagers(), adminApi.listGlobalAiBudgetManagerCandidates()]);
      const setting = budget.data.setting;
      if (setting) { setForm({ ...defaultForm, ...setting, monthlyBudgetJpy: Number(setting.monthlyBudgetJpy ?? 1000), reason: '' }); setEmails(setting.notificationEmails.join('\n')); }
      setDeliveries(history.data ?? []);
      setManagers(managerList.data ?? []);
      setCandidates(candidateList.data ?? []);
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
  const addManager = async () => {
    if (selectedCandidateId === null) { showAlert('追加する利用者を選択してください'); return; }
    try {
      await adminApi.addGlobalAiBudgetManager(selectedCandidateId, managerReason);
      showAlert('追加しました', '全体AI予算管理者を追加しました。');
      setSelectedCandidateId(null); setManagerReason(''); await load();
    } catch (error) { showApiErrorAlert('管理者の追加に失敗しました', error); }
  };
  const confirmRemoveManager = (manager: GlobalAiBudgetManager) => {
    if (!managerReason.trim()) { showAlert('変更理由を入力してください'); return; }
    showConfirmDialog(
      '全体AI予算管理者を削除',
      `${manager.member.name}さんを全体AI予算管理者から削除します。最後の有効な管理者は削除できません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: async () => {
          try { await adminApi.removeGlobalAiBudgetManager(manager.memberId, managerReason); showAlert('削除しました', '全体AI予算管理者を削除しました。'); setManagerReason(''); await load(); }
          catch (error) { showApiErrorAlert('管理者の削除に失敗しました', error); }
        } },
      ],
    );
  };
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
    <View style={cardStyles.section}>
      <Text style={styles.sectionTitle}>全体AI予算管理者</Text>
      <Text style={styles.description}>ADMIN権限と二要素認証を有効にしている利用者だけを追加できます。変更理由は監査記録に保存されます。</Text>
      {managers.map((manager) => <View key={manager.id} style={styles.managerRow}>
        <View><Text style={styles.managerName}>{manager.member.name}</Text><Text style={styles.managerDetail}>世帯ID: {manager.member.familyGroupId} ／ TOTP有効</Text></View>
        <AppButton title="削除" variant="dangerFilled" onPress={() => confirmRemoveManager(manager)} />
      </View>)}
      <AppFormField label="追加する利用者">
        <AppSelect<number | null> selectedValue={selectedCandidateId} onValueChange={setSelectedCandidateId} options={candidates.map((candidate) => ({ value: candidate.id, label: `${candidate.name}（${candidate.familyGroup.name}）` }))} placeholder="利用者を選択してください" />
      </AppFormField>
      <AppFormField label="管理者変更理由"><AppTextInput value={managerReason} onChangeText={setManagerReason} /></AppFormField>
      <AppButton title="全体AI予算管理者を追加" onPress={addManager} disabled={selectedCandidateId === null || !managerReason.trim()} fullWidth />
    </View>
    <Text style={screenLayout.headerTitle}>通知配送履歴</Text>
    {deliveries.length === 0 ? <Text>配送履歴はありません。</Text> : deliveries.map((delivery) => <View key={delivery.id} style={cardStyles.listCard}><Text>{delivery.kind === 'TEST' ? '試験通知' : `${delivery.month} ${delivery.thresholdPercent}%`}</Text><Text>{delivery.channel === 'DISCORD' ? 'Discord' : delivery.recipient} ／ {delivery.status} ／ {delivery.attempts}回</Text>{delivery.lastError ? <Text>最終エラー: {delivery.lastError}</Text> : null}</View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text.main, fontSize: 18, fontWeight: 'bold', marginBottom: spacing.xs },
  description: { color: colors.text.muted, lineHeight: 20, marginBottom: spacing.md },
  managerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  managerName: { color: colors.text.main, fontWeight: 'bold' },
  managerDetail: { color: colors.text.muted, marginTop: spacing.xs },
});
