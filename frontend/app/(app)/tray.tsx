import React from 'react';

import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import { ReceiptTrayScreen } from '../../src/screens/ReceiptTrayScreen';

export default function TrayRoute() {
  const { goBackOrHome } = useAppNavigation();

  return (
    <AppScreenShell fullWidth>
      <ReceiptTrayScreen onBack={goBackOrHome} />
    </AppScreenShell>
  );
}
