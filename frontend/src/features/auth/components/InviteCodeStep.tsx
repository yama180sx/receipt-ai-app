import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formStyles } from '../../../theme';
import { authScreenStyles } from '../styles/authScreenStyles';

type Props = {
  inviteCode: string;
  loading: boolean;
  accentColor: string;
  onInviteCodeChange: (value: string) => void;
  onSubmit: () => void;
};

export const InviteCodeStep: React.FC<Props> = ({
  inviteCode,
  loading,
  accentColor,
  onInviteCodeChange,
  onSubmit,
}) => (
  <>
    <Text style={authScreenStyles.subtitle}>招待コードを入力してください</Text>
    <View style={[formStyles.field, authScreenStyles.inputWrapper]}>
      <TextInput
        style={authScreenStyles.input}
        placeholder="例: YAMAMOTO-2026"
        placeholderTextColor="rgba(255,255,255,0.6)"
        value={inviteCode}
        onChangeText={onInviteCodeChange}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
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
        <Text style={[authScreenStyles.primaryButtonText, { color: accentColor }]}>次へ</Text>
      )}
    </TouchableOpacity>
  </>
);
