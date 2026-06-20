import React from 'react';
import { Redirect } from 'expo-router';

import { ResponsiveContainer } from '../src/components/ResponsiveContainer';
import { LoginScreen } from '../src/screens/LoginScreen';
import { useAppSessionContext } from '../src/features/app/contexts/AppSessionContext';

export default function LoginRoute() {
  const { userToken, handleLoginSuccess } = useAppSessionContext();

  if (userToken) {
    return <Redirect href="/" />;
  }

  return (
    <ResponsiveContainer fullWidth={false}>
      <LoginScreen onLoginSuccess={handleLoginSuccess} />
    </ResponsiveContainer>
  );
}
