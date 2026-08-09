import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { AdminMenuScreen } from '../../../src/screens/AdminMenuScreen';

export default function AdminMenuRoute() {
  const { router, goHome, goBackOrReplace } = useAppNavigation();

  return (
    <AppScreenShell fullWidth>
      <AdminMenuScreen
        onBack={goHome}
        onGoToPromptEditor={() => router.push('/admin/prompts')}
        onGoToAdminStats={() => router.push('/admin/stats')}
        onGoToStandardProductClassificationRules={() => router.push('/admin/product-classification-rules')}
        onGoToProductClassificationReclassification={() => router.push('/admin/product-classification-reclassification')}
      />
    </AppScreenShell>
  );
}
