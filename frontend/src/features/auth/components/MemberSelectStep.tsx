import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import type { AuthFamilyMember } from '../../../types/auth';
import { authScreenStyles } from '../styles/authScreenStyles';

type Props = {
  familyName?: string;
  members: AuthFamilyMember[];
  loading: boolean;
  accentColor: string;
  onSelectMember: (member: AuthFamilyMember) => void;
  onResetToInvite: () => void;
};

export const MemberSelectStep: React.FC<Props> = ({
  familyName,
  members,
  loading,
  accentColor,
  onSelectMember,
  onResetToInvite,
}) => (
  <>
    <Text style={authScreenStyles.familyLabel}>{familyName}</Text>
    <Text style={authScreenStyles.subtitle}>ログインするメンバーを選択</Text>
    <ScrollView style={authScreenStyles.memberList} contentContainerStyle={authScreenStyles.memberListContent}>
      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={authScreenStyles.memberButton}
          onPress={() => onSelectMember(member)}
          disabled={loading}
        >
          <Text style={[authScreenStyles.memberButtonText, { color: accentColor }]}>{member.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    <TouchableOpacity style={authScreenStyles.linkButton} onPress={onResetToInvite} disabled={loading}>
      <Text style={authScreenStyles.linkButtonText}>別の世帯でログイン</Text>
    </TouchableOpacity>
  </>
);
