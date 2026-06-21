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
        onGoToCategories={() => router.push('/admin/categories')}
        onGoToProductMaster={() => router.push('/admin/product-master')}
        onGoToPromptEditor={() => router.push('/admin/prompts')}
        onGoToAdminStats={() => router.push('/admin/stats')}
      />
    </AppScreenShell>
  );
}
