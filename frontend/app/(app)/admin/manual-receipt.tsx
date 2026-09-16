import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { ManualReceiptScreen } from '../../../src/screens/ManualReceiptScreen';

export default function ManualReceiptRoute() {
  const { goBackOrReplace } = useAppNavigation();
  return (
    <AppScreenShell fullWidth>
      <ManualReceiptScreen onBack={() => goBackOrReplace('/admin')} onDenied={() => goBackOrReplace('/')} />
    </AppScreenShell>
  );
}
