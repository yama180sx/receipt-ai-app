import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { AdminStatsScreen } from '../../../src/screens/AdminStatsScreen';

export default function AdminStatsRoute() {
  const { goBackOrReplace } = useAppNavigation();

  return (
    <AppScreenShell fullWidth>
      <AdminStatsScreen onBack={() => goBackOrReplace('/admin')} />
    </AppScreenShell>
  );
}
