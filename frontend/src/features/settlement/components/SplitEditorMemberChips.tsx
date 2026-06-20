import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../../../theme';
import { webPickerOutlineReset } from '../../../utils/webPlatformStyles';
import type { FamilyMemberSummary } from '../../../types/settlement';

interface SplitEditorMemberChipsProps {
  activeMembers: FamilyMemberSummary[];
  inactiveMembers: FamilyMemberSummary[];
  onRemoveMember: (memberId: number) => void;
  onAddMember: (memberId: number) => void;
}

export const SplitEditorMemberChips: React.FC<SplitEditorMemberChipsProps> = ({
  activeMembers,
  inactiveMembers,
  onRemoveMember,
  onAddMember,
}) => (
  <View style={styles.targetSection}>
    <View style={styles.targetHeader}>
      <Text style={styles.targetTitle}>👤 割り勘の対象者</Text>
    </View>

    <View style={styles.memberChips}>
      {activeMembers.map((m, idx) => (
        <View key={m.id} style={[styles.chip, idx === 0 && styles.firstChip]}>
          <Text style={[styles.chipText, idx === 0 && styles.firstChipText]}>
            {m.name} {idx === 0 && '(端数負担)'}
          </Text>
          {activeMembers.length > 1 && idx !== 0 && (
            <TouchableOpacity
              onPress={() => onRemoveMember(m.id)}
              style={styles.chipClose}
            >
              <Text style={styles.chipCloseText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {inactiveMembers.length > 0 && (
        <View style={styles.addMemberWrapper}>
          <Picker
            selectedValue=""
            onValueChange={(val) => {
              if (val) onAddMember(Number(val));
            }}
            style={styles.addPicker}
          >
            <Picker.Item label="+ 人を追加" value="" color={theme.colors.primary} />
            {inactiveMembers.map((am) => (
              <Picker.Item key={am.id} label={am.name} value={am.id} />
            ))}
          </Picker>
        </View>
      )}
    </View>
  </View>
);

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
  targetSection: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    padding: 15,
    paddingHorizontal: 20,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text.main },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sem.info.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: sem.info.border,
  },
  firstChip: { backgroundColor: sem.neutral.bg, borderColor: sem.neutral.border },
  chipText: { color: sem.info.text, fontWeight: 'bold', fontSize: 14 },
  firstChipText: { color: theme.colors.text.muted },
  chipClose: {
    marginLeft: 8,
    backgroundColor: 'rgba(3,105,161,0.1)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCloseText: { color: sem.info.text, fontSize: 10, fontWeight: 'bold' },
  addMemberWrapper: {
    height: 32,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  addPicker: {
    height: 32,
    width: 120,
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    ...webPickerOutlineReset,
  },
});
