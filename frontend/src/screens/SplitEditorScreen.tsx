import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Platform,
  useWindowDimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme, BREAKPOINTS } from '../theme';
import { api } from '../utils/apiClient';

interface SplitEditorScreenProps {
  receipt: any;
  onBack: () => void;
}

export const SplitEditorScreen: React.FC<SplitEditorScreenProps> = ({ receipt, onBack }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.TABLET;

  const [allMembers, setAllMembers] = useState<any[]>([]); 
  const [activeMembers, setActiveMembers] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 明細ごとの入力状態
  // { itemId: { memberId: 500 } }
  const [editSplits, setEditSplits] = useState<Record<number, Record<number, number>>>({});

  const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.getFamilyMembers();
        if (res.success) {
          setAllMembers(res.data);
          
          let initialActive: any[] = [];
          
          const hasExistingSplits = receipt.items.some((item: any) => item.splits && item.splits.length > 0);

          if (hasExistingSplits) {
            const splitMemberIds = new Set<number>();
            receipt.items.forEach((item: any) => {
              if (item.splits) {
                item.splits.forEach((s: any) => splitMemberIds.add(s.familyMemberId));
              }
            });
            
            const payer = res.data.find((m: any) => m.id === receipt.memberId);
            if (payer) initialActive.push(payer);
            
            res.data.forEach((m: any) => {
              if (splitMemberIds.has(m.id) && m.id !== receipt.memberId) {
                initialActive.push(m);
              }
            });

          } else {
            const payer = res.data.find((m: any) => m.id === receipt.memberId);
            if (payer) initialActive.push(payer);
            const others = res.data.filter((m: any) => m.id !== receipt.memberId);
            if (others.length > 0) initialActive.push(others[0]);
          }

          if (initialActive.length === 0) {
            initialActive = res.data.slice(0, 2);
          }
          
          setActiveMembers(initialActive);
          initializeSplits(res.data, initialActive);
        }
      } catch (err) {
        console.error('メンバー取得失敗', err);
        Alert.alert('エラー', 'メンバー情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [receipt]);

  const initializeSplits = (familyMembers: any[], targetMembers: any[]) => {
    if (!receipt || !receipt.items) return;
    
    const initialData: Record<number, Record<number, number>> = {};
    receipt.items.forEach((item: any) => {
      initialData[item.id] = {};
      const itemTotal = Math.round((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1));

      if (item.splits && item.splits.length > 0) {
        targetMembers.forEach(m => {
          const split = item.splits.find((s: any) => s.familyMemberId === m.id);
          initialData[item.id][m.id] = split ? split.amount : 0;
        });
      } else {
        targetMembers.forEach(m => {
          initialData[item.id][m.id] = m.id === receipt.memberId ? itemTotal : 0;
        });
      }
    });
    setEditSplits(initialData);
  };

  const addMember = (memberId: number) => {
    if (activeMembers.find(m => m.id === memberId)) return;
    const memberToAdd = allMembers.find(m => m.id === memberId);
    if (memberToAdd) {
      const newActive = [...activeMembers, memberToAdd];
      setActiveMembers(newActive);
      
      setEditSplits(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(itemId => {
          next[Number(itemId)] = { ...next[Number(itemId)], [memberId]: 0 };
        });
        return next;
      });
    }
  };

  const removeMember = (memberId: number) => {
    if (activeMembers.length <= 1) {
      Alert.alert('エラー', '対象者は最低1人必要です。');
      return;
    }
    const newActive = activeMembers.filter(m => m.id !== memberId);
    setActiveMembers(newActive);

    setEditSplits(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(itemId => {
        const nId = Number(itemId);
        const newData = { ...next[nId] };
        delete newData[memberId];
        next[nId] = newData;
      });
      return next;
    });
  };

  const handleAmountChange = (itemId: number, memberId: number, value: string, itemTotal: number) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    let valToSet = numericValue === '' ? 0 : parseInt(numericValue, 10);
    if (valToSet > itemTotal) valToSet = itemTotal; 

    const newData = { ...editSplits[itemId] };
    newData[memberId] = valToSet;
    
    const firstMemberId = activeMembers[0].id;
    if (memberId !== firstMemberId) {
      let sumOthers = 0;
      activeMembers.forEach(m => {
        if (m.id !== firstMemberId) {
          sumOthers += newData[m.id] || 0;
        }
      });
      newData[firstMemberId] = Math.max(0, itemTotal - sumOthers);
    }
    
    setEditSplits(prev => ({ ...prev, [itemId]: newData }));
  };

  const handlePercentChange = (itemId: number, memberId: number, value: string, itemTotal: number) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    let percent = numericValue === '' ? 0 : parseInt(numericValue, 10);
    if (percent > 100) percent = 100;

    const calculatedAmount = Math.round(itemTotal * (percent / 100));

    const newData = { ...editSplits[itemId] };
    newData[memberId] = calculatedAmount;

    const firstMemberId = activeMembers[0].id;
    if (memberId !== firstMemberId) {
      let sumOthers = 0;
      activeMembers.forEach(m => {
        if (m.id !== firstMemberId) {
          sumOthers += newData[m.id] || 0;
        }
      });
      newData[firstMemberId] = Math.max(0, itemTotal - sumOthers);
    }

    setEditSplits(prev => ({ ...prev, [itemId]: newData }));
  };

  const splitItemEqually = (itemId: number, itemTotal: number) => {
    const newData = { ...editSplits[itemId] };
    const memberCount = activeMembers.length;
    if (memberCount === 0) return;

    const baseAmount = Math.floor(itemTotal / memberCount);
    activeMembers.forEach((m, idx) => {
      newData[m.id] = idx === 0 ? itemTotal - (baseAmount * (memberCount - 1)) : baseAmount;
    });
    
    setEditSplits(prev => ({ ...prev, [itemId]: newData }));
  };

  // ★ 追加: 合計行の変更を全明細にカスケードするロジック
  const applyCascadePercent = (memberId: number, percent: number) => {
    if (activeMembers.length <= 1 || percent < 0 || percent > 100) return;

    const firstMemberId = activeMembers[0].id;
    if (memberId === firstMemberId) return; // 先頭は常に自動計算のためスキップ

    setEditSplits(prev => {
      const next = { ...prev };
      receipt.items.forEach((item: any) => {
        const itemTotal = Math.round((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1));
        const newData = { ...next[item.id] };

        // 入力された％に基づいて金額を算出
        const calculatedAmount = Math.round(itemTotal * (percent / 100));
        newData[memberId] = calculatedAmount;

        // 先頭メンバーの端数調整
        let sumOthers = 0;
        activeMembers.forEach(m => {
          if (m.id !== firstMemberId) {
            sumOthers += newData[m.id] || 0;
          }
        });
        newData[firstMemberId] = Math.max(0, itemTotal - sumOthers);

        next[item.id] = newData;
      });
      return next;
    });
  };

  // ★ 追加: 合計行の金額変更ハンドラ
  const handleTotalAmountChange = (memberId: number, value: string, receiptTotal: number) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    let valToSet = numericValue === '' ? 0 : parseInt(numericValue, 10);
    if (valToSet > receiptTotal) valToSet = receiptTotal;

    // 入力された金額から割合（％）を算出し、全明細に適用
    const percent = receiptTotal > 0 ? (valToSet / receiptTotal) * 100 : 0;
    applyCascadePercent(memberId, percent);
  };

  // ★ 追加: 合計行の％変更ハンドラ
  const handleTotalPercentChange = (memberId: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    let percent = numericValue === '' ? 0 : parseInt(numericValue, 10);
    applyCascadePercent(memberId, percent);
  };

  // ★ 追加: レシート全体を均等割り
  const splitWholeReceiptEqually = () => {
    receipt.items.forEach((item: any) => {
      const itemTotal = Math.round((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1));
      splitItemEqually(item.id, itemTotal);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const savePromises = receipt.items.map(async (item: any) => {
        const payloadSplits = activeMembers.map(m => ({
          familyMemberId: m.id,
          amount: editSplits[item.id]?.[m.id] || 0
        })).filter(p => p.amount > 0);

        return api.saveItemSplits(item.id, payloadSplits);
      });

      await Promise.all(savePromises);
      Alert.alert('保存完了', '割り勘設定を保存しました。', [{ text: 'OK', onPress: onBack }]);
    } catch (err) {
      console.error('保存エラー', err);
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !receipt) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const getImageUrl = () => receipt.imagePath ? `${BASE_URL}/${receipt.imagePath}` : null;

  // レシート全体の合計額を算出
  const receiptTotalAmount = receipt.items.reduce((sum: number, item: any) => {
    return sum + Math.round((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1));
  }, 0);

  // 合計行表示用: メンバーごとの合計額を計算
  const getMemberTotalAmount = (memberId: number) => {
    let sum = 0;
    receipt.items.forEach((item: any) => {
      sum += editSplits[item.id]?.[memberId] || 0;
    });
    return sum;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>割り勘エディタ</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.colors.text.inverse} size="small" /> : <Text style={styles.saveButtonText}>確定して保存</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.targetSection}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetTitle}>👤 割り勘の対象者</Text>
        </View>
        
        <View style={styles.memberChips}>
          {activeMembers.map((m, idx) => (
            <View key={m.id} style={[styles.chip, idx === 0 && styles.firstChip]}>
              <Text style={[styles.chipText, idx === 0 && styles.firstChipText]}>
                {m.name} {idx === 0 && "(端数負担)"}
              </Text>
              {activeMembers.length > 1 && idx !== 0 && (
                <TouchableOpacity onPress={() => removeMember(m.id)} style={styles.chipClose}>
                  <Text style={styles.chipCloseText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {allMembers.filter(am => !activeMembers.find(m => m.id === am.id)).length > 0 && (
            <View style={styles.addMemberWrapper}>
              <Picker
                selectedValue=""
                onValueChange={(val) => { if(val) addMember(Number(val)); }}
                style={styles.addPicker}
              >
                <Picker.Item label="+ 人を追加" value="" color={theme.colors.primary} />
                {allMembers
                  .filter(am => !activeMembers.find(m => m.id === am.id))
                  .map(am => <Picker.Item key={am.id} label={am.name} value={am.id} />)
                }
              </Picker>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.mainLayout, isWide ? styles.rowLayout : styles.colLayout]}>
        <View style={[styles.imagePane, isWide && { width: 350 }]}>
          <View style={styles.imageBox}>
            {getImageUrl() ? (
              <Image source={{ uri: getImageUrl()! }} style={styles.receiptImage} resizeMode="contain" />
            ) : (
              <Text style={styles.noImageText}>画像がありません</Text>
            )}
          </View>
        </View>

        <View style={styles.editorPane}>
          <View style={styles.editorToolbar}>
            <Text style={styles.storeName}>{receipt.storeName || '店名不明'}</Text>
          </View>

          <ScrollView style={styles.tableScroll} horizontal={false}>
            <ScrollView horizontal={true} contentContainerStyle={{ flexDirection: 'column' }}>
              
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.cellName, styles.headerText]}>商品名</Text>
                <Text style={[styles.cell, styles.cellAmount, styles.headerText]}>合計</Text>
                {activeMembers.map(m => (
                  <Text key={m.id} style={[styles.cell, styles.cellInputCol, styles.headerText, { textAlign: 'center' }]}>
                    {m.name}
                  </Text>
                ))}
                <Text style={[styles.cell, styles.cellAction, styles.headerText]}>操作</Text>
              </View>

              {receipt.items.map((item: any) => {
                const itemTotal = Math.round((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1));

                return (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellName]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.cell, styles.cellAmount]}>¥{itemTotal.toLocaleString()}</Text>
                    
                    {activeMembers.map((m, idx) => {
                      const amountValue = editSplits[item.id]?.[m.id] || 0;
                      const percentValue = itemTotal > 0 ? Math.round((amountValue / itemTotal) * 100) : 0;
                      const isFirst = idx === 0;

                      return (
                        <View key={m.id} style={[styles.cell, styles.cellInputCol]}>
                          <View style={styles.dualInputWrapper}>
                            <View style={styles.inputGroup}>
                              <TextInput
                                style={[styles.inputBox, styles.percentBox, isFirst && styles.disabledInputBox]}
                                value={String(percentValue)}
                                onChangeText={(val) => handlePercentChange(item.id, m.id, val, itemTotal)}
                                keyboardType="number-pad"
                                editable={!isFirst}
                                selectTextOnFocus
                              />
                              <Text style={styles.unitText}>%</Text>
                            </View>
                            
                            <View style={[styles.inputGroup, { marginLeft: 4 }]}>
                              <TextInput
                                style={[styles.inputBox, styles.amountBox, isFirst && styles.disabledInputBox]}
                                value={String(amountValue)}
                                onChangeText={(val) => handleAmountChange(item.id, m.id, val, itemTotal)}
                                keyboardType="number-pad"
                                editable={!isFirst}
                                selectTextOnFocus
                              />
                              <Text style={styles.unitText}>円</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    <View style={[styles.cell, styles.cellAction]}>
                      <TouchableOpacity style={styles.splitBtnSmall} onPress={() => splitItemEqually(item.id, itemTotal)}>
                        <Text style={styles.splitBtnSmallText}>均等</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* ★ 追加: 合計行 (Total) */}
              <View style={[styles.tableRow, styles.totalRow]}>
                <Text style={[styles.cell, styles.cellName, styles.totalText]}>一括調整（全体合計）</Text>
                <Text style={[styles.cell, styles.cellAmount, styles.totalText]}>¥{receiptTotalAmount.toLocaleString()}</Text>
                
                {activeMembers.map((m, idx) => {
                  const memberTotal = getMemberTotalAmount(m.id);
                  const percentValue = receiptTotalAmount > 0 ? Math.round((memberTotal / receiptTotalAmount) * 100) : 0;
                  const isFirst = idx === 0;

                  return (
                    <View key={m.id} style={[styles.cell, styles.cellInputCol]}>
                      <View style={styles.dualInputWrapper}>
                        <View style={[styles.inputGroup, styles.totalInputGroup]}>
                          <TextInput
                            style={[styles.inputBox, styles.percentBox, isFirst && styles.disabledInputBox, styles.totalInputBox]}
                            value={String(percentValue)}
                            onChangeText={(val) => handleTotalPercentChange(m.id, val)}
                            keyboardType="number-pad"
                            editable={!isFirst}
                            selectTextOnFocus
                          />
                          <Text style={[styles.unitText, styles.totalUnitText]}>%</Text>
                        </View>
                        
                        <View style={[styles.inputGroup, styles.totalInputGroup, { marginLeft: 4 }]}>
                          <TextInput
                            style={[styles.inputBox, styles.amountBox, isFirst && styles.disabledInputBox, styles.totalInputBox]}
                            value={String(memberTotal)}
                            onChangeText={(val) => handleTotalAmountChange(m.id, val, receiptTotalAmount)}
                            keyboardType="number-pad"
                            editable={!isFirst}
                            selectTextOnFocus
                          />
                          <Text style={[styles.unitText, styles.totalUnitText]}>円</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <View style={[styles.cell, styles.cellAction]}>
                  <TouchableOpacity style={styles.splitBtnSmall} onPress={splitWholeReceiptEqually}>
                    <Text style={styles.splitBtnSmallText}>均等</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </ScrollView>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { paddingRight: 15 },
  backButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.main },
  headerRight: { minWidth: 100, alignItems: 'flex-end' },
  saveButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: theme.colors.text.inverse, fontWeight: 'bold', fontSize: 16 },
  
  targetSection: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, padding: 15, paddingHorizontal: 20 },
  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  targetTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text.main },
  
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: sem.info.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: sem.info.border },
  firstChip: { backgroundColor: sem.neutral.bg, borderColor: sem.neutral.border },
  chipText: { color: sem.info.text, fontWeight: 'bold', fontSize: 14 },
  firstChipText: { color: theme.colors.text.muted },
  chipClose: { marginLeft: 8, backgroundColor: 'rgba(3,105,161,0.1)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  chipCloseText: { color: sem.info.text, fontSize: 10, fontWeight: 'bold' },
  addMemberWrapper: { height: 32, justifyContent: 'center', backgroundColor: theme.colors.background, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  addPicker: { height: 32, width: 120, color: theme.colors.primary, fontSize: 14, fontWeight: 'bold', ...Platform.select({ web: { outlineStyle: 'none', border: 'none', background: 'transparent' } as any }) },
  
  mainLayout: { flex: 1, padding: 20, gap: 20 },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },
  imagePane: { height: '100%', minHeight: 300 },
  imageBox: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  receiptImage: { width: '100%', height: '100%' },
  noImageText: { color: theme.colors.text.muted },
  editorPane: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  editorToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  storeName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  
  tableScroll: { flex: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: sem.table.rowBorder, alignItems: 'center', minWidth: 800 },
  tableHeader: { backgroundColor: sem.table.headerBg, borderBottomColor: theme.colors.border },
  
  totalRow: { backgroundColor: sem.warning.bg, borderTopWidth: 2, borderTopColor: sem.warning.border },
  totalText: { fontWeight: 'bold', color: sem.warning.text },
  totalInputGroup: { borderColor: sem.warning.border, backgroundColor: sem.warning.inputBg },
  totalInputBox: { fontWeight: 'bold', color: sem.warning.text },
  totalUnitText: { color: sem.warning.text, fontWeight: 'bold' },

  cell: { padding: 12, justifyContent: 'center' },
  headerText: { fontWeight: 'bold', color: theme.colors.text.muted, fontSize: 13 },
  cellName: { width: 160, fontSize: 14, color: theme.colors.text.main },
  cellAmount: { width: 90, fontSize: 14, fontWeight: 'bold', textAlign: 'right', color: theme.colors.text.main },
  cellInputCol: { width: 180, alignItems: 'center' },
  
  dualInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, height: 36, paddingRight: 4 },
  inputBox: { height: '100%', textAlign: 'right', fontSize: 14, color: theme.colors.text.main, paddingRight: 4, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  percentBox: { width: 35 },
  amountBox: { width: 60 },
  disabledInputBox: { backgroundColor: sem.neutral.bg, color: theme.colors.text.muted },
  unitText: { fontSize: 11, color: theme.colors.text.muted },
  
  cellAction: { width: 70, alignItems: 'center' },
  splitBtnSmall: { backgroundColor: sem.neutral.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  splitBtnSmallText: { fontSize: 12, color: theme.colors.text.muted, fontWeight: 'bold' },
});