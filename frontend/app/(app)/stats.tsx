import React from 'react';

import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import { StatisticsScreen } from '../../src/screens/StatisticsScreen';

export default function StatsRoute() {
  const { goBackOrHome, session } = useAppNavigation();
  const { currentMemberId } = session;

  if (!currentMemberId) {
    return null;
  }

  return (
    <AppScreenShell fullWidth>
      <StatisticsScreen currentMemberId={currentMemberId} onBack={goBackOrHome} />
    </AppScreenShell>
  );
}
