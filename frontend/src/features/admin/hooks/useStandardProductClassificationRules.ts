import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, receiptApi, type ProductTypeSummary, type StandardProductClassificationRule } from '../../../api';
import { showApiErrorAlert } from '../../../utils/apiError';

export function useStandardProductClassificationRules() {
  const [rules, setRules] = useState<StandardProductClassificationRule[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [productTypeId, setProductTypeId] = useState<number | null>(null);
  const [priority, setPriority] = useState('100');
  const [reason, setReason] = useState('');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ruleResponse, productTypeResponse] = await Promise.all([
        adminApi.listStandardProductClassificationRules(), receiptApi.listProductTypes(),
      ]);
      setRules(ruleResponse.data);
      setProductTypes(productTypeResponse.data);
    } catch (error) {
      showApiErrorAlert('標準ルールの取得に失敗しました', error);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const productTypeOptions = useMemo(() => productTypes.map((type) => ({ value: type.id, label: type.name })), [productTypes]);
  const preview = useCallback(async () => {
    try {
      const response = await adminApi.previewStandardProductClassificationRule(keyword);
      setPreviewText(`命中 ${response.data.matchedCount}件${response.data.items.length ? `：${response.data.items.map((item) => item.name).join(' / ')}` : ''}`);
    } catch (error) { showApiErrorAlert('プレビューに失敗しました', error); }
  }, [keyword]);
  const create = useCallback(async () => {
    const parsedPriority = Number(priority);
    if (!productTypeId || !Number.isInteger(parsedPriority) || !reason.trim()) return;
    try {
      if (editingId) await adminApi.updateStandardProductClassificationRule(editingId, { keyword, productTypeId, priority: parsedPriority, reason });
      else await adminApi.createStandardProductClassificationRule({ keyword, productTypeId, priority: parsedPriority, reason });
      setKeyword(''); setReason(''); setPreviewText(null); setEditingId(null); await load();
    } catch (error) { showApiErrorAlert('標準ルールの登録に失敗しました', error); }
  }, [editingId, keyword, load, priority, productTypeId, reason]);
  const beginEdit = useCallback((rule: StandardProductClassificationRule) => {
    setEditingId(rule.id); setKeyword(rule.keyword); setProductTypeId(rule.productType.id); setPriority(String(rule.priority)); setReason(rule.lastChangeReason);
  }, []);
  const deactivate = useCallback(async (id: number) => {
    try { await adminApi.deactivateStandardProductClassificationRule(id, '管理画面から無効化'); await load(); }
    catch (error) { showApiErrorAlert('標準ルールの無効化に失敗しました', error); }
  }, [load]);

  return { rules, keyword, setKeyword, productTypeId, setProductTypeId, priority, setPriority, reason, setReason, previewText, preview, create, deactivate, beginEdit, editingId, productTypeOptions, loading };
}
