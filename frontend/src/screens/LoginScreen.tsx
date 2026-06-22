import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { DevEnvironmentBanner } from '../components/DevEnvironmentBanner';
import { getAppDisplayName } from '../config/appEnv';
import {
  authScreenStyles,
  InviteCodeStep,
  MemberSelectStep,
  PasswordStep,
  TotpSetupStep,
  TotpVerifyStep,
  useLoginFlow,
} from '../features/auth';
import type { LoginResult } from '../types/auth';

type Props = {
  onLoginSuccess: (result: LoginResult, context: { familyName: string; inviteCode: string }) => void;
};

/** Issue #100-7 (#431): step router のみ — 認証ロジックは features/auth/useLoginFlow */
export function LoginScreen({ onLoginSuccess }: Props) {
  const flow = useLoginFlow({ onLoginSuccess });

  return (
    <KeyboardAvoidingView
      style={[authScreenStyles.container, { backgroundColor: flow.accentColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={flow.scrollRef}
        contentContainerStyle={[
          authScreenStyles.scrollContent,
          flow.isTotpStep ? authScreenStyles.scrollContentTotp : authScreenStyles.scrollContentCentered,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DevEnvironmentBanner />
        <Text style={authScreenStyles.title}>{getAppDisplayName()}</Text>
        <Text style={authScreenStyles.tagline}>レシートで家計を管理</Text>
        {flow.step === 'invite' && (
          <InviteCodeStep
            inviteCode={flow.inviteCode}
            loading={flow.loading}
            accentColor={flow.accentColor}
            onInviteCodeChange={flow.setInviteCode}
            onSubmit={flow.handleResolveFamily}
          />
        )}
        {flow.step === 'member' && (
          <MemberSelectStep
            familyName={flow.family?.name}
            members={flow.members}
            loading={flow.loading}
            accentColor={flow.accentColor}
            onSelectMember={flow.handleSelectMember}
            onResetToInvite={flow.resetToInvite}
          />
        )}
        {flow.step === 'password' && (
          <PasswordStep
            familyName={flow.family?.name}
            memberName={flow.selectedMember?.name}
            password={flow.password}
            loading={flow.loading}
            accentColor={flow.accentColor}
            onPasswordChange={flow.setPassword}
            onSubmit={flow.handleLogin}
            onBackToMember={flow.goBackToMember}
            onResetToInvite={flow.resetToInvite}
          />
        )}
        {flow.step === 'totp_setup' && (
          <TotpSetupStep
            familyName={flow.family?.name}
            totpSecret={flow.totpSecret}
            totpCode={flow.totpCode}
            loading={flow.loading}
            accentColor={flow.accentColor}
            onTotpCodeChange={flow.setTotpCode}
            onSubmit={flow.handleConfirmTotpSetup}
            onInputFocus={flow.scrollToFormBottom}
          />
        )}
        {flow.step === 'totp_verify' && (
          <TotpVerifyStep
            familyName={flow.family?.name}
            totpCode={flow.totpCode}
            loading={flow.loading}
            accentColor={flow.accentColor}
            onTotpCodeChange={flow.setTotpCode}
            onSubmit={flow.handleVerifyTotp}
            onInputFocus={flow.scrollToFormBottom}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
