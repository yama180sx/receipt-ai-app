import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { TotpSettingsScreen } from '../../../src/screens/TotpSettingsScreen';

export default function TotpSettingsRoute() {
  const { goBackOrHome, session } = useAppNavigation();
  const { totpEnabled, setTotpEnabled } = session;

  return (
    <AppScreenShell fullWidth={false}>
      <TotpSettingsScreen
        totpEnabled={totpEnabled}
        onBack={goBackOrHome}
        onChanged={setTotpEnabled}
      />
    </AppScreenShell>
  );
}
