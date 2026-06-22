import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formStyles } from '../../../theme';
import { authScreenStyles } from '../styles/authScreenStyles';

type Props = {
  familyName?: string;
  totpCode: string;
  loading: boolean;
  accentColor: string;
  onTotpCodeChange: (value: string) => void;
  onSubmit: () => void;
  onInputFocus: () => void;
};

export const TotpVerifyStep: React.FC<Props> = ({
  familyName,
  totpCode,
  loading,
  accentColor,
  onTotpCodeChange,
  onSubmit,
  onInputFocus,
}) => (
  <>
    <Text style={authScreenStyles.familyLabel}>{familyName}</Text>
    <Text style={authScreenStyles.subtitle}>二要素認証コードを入力</Text>
    <View style={[formStyles.field, authScreenStyles.inputWrapper]}>
      <TextInput
        style={authScreenStyles.input}
        placeholder="6桁コード"
        placeholderTextColor="rgba(255,255,255,0.6)"
        value={totpCode}
        onChangeText={onTotpCodeChange}
        onFocus={onInputFocus}
        keyboardType="number-pad"
        maxLength={6}
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
        <Text style={[authScreenStyles.primaryButtonText, { color: accentColor }]}>確認</Text>
      )}
    </TouchableOpacity>
  </>
);
