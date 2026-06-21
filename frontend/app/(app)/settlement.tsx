import React from 'react';

import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import { SettlementSummaryScreen } from '../../src/screens/SettlementSummaryScreen';

export default function SettlementRoute() {
  const { goBackOrHome } = useAppNavigation();

  return (
    <AppScreenShell fullWidth>
      <SettlementSummaryScreen onBack={goBackOrHome} />
    </AppScreenShell>
  );
}
