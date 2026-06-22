import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formStyles } from '../../../theme';
import { authScreenStyles } from '../styles/authScreenStyles';

type Props = {
  familyName?: string;
  memberName?: string;
  password: string;
  loading: boolean;
  accentColor: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBackToMember: () => void;
  onResetToInvite: () => void;
};

export const PasswordStep: React.FC<Props> = ({
  familyName,
  memberName,
  password,
  loading,
  accentColor,
  onPasswordChange,
  onSubmit,
  onBackToMember,
  onResetToInvite,
}) => (
  <>
    <Text style={authScreenStyles.familyLabel}>{familyName}</Text>
    <Text style={authScreenStyles.subtitle}>{memberName} としてログイン</Text>
    <View style={[formStyles.field, authScreenStyles.inputWrapper]}>
      <TextInput
        style={authScreenStyles.input}
        placeholder="パスワードを入力"
        placeholderTextColor="rgba(255,255,255,0.6)"
        secureTextEntry
        value={password}
        onChangeText={onPasswordChange}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        onSubmitEditing={onSubmit}
      />
    </View>
    <TouchableOpacity
      style={[authScreenStyles.primaryButton, loading && authScreenStyles.buttonDisabled]}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={accentColor} />
      ) : (
        <Text style={[authScreenStyles.primaryButtonText, { color: accentColor }]}>ログイン</Text>
      )}
    </TouchableOpacity>
    <TouchableOpacity style={authScreenStyles.secondaryButton} onPress={onBackToMember} disabled={loading}>
      <Text style={authScreenStyles.secondaryButtonText}>メンバー選択に戻る</Text>
    </TouchableOpacity>
    <TouchableOpacity style={authScreenStyles.linkButton} onPress={onResetToInvite} disabled={loading}>
      <Text style={authScreenStyles.linkButtonText}>別の世帯でログイン</Text>
    </TouchableOpacity>
  </>
);
