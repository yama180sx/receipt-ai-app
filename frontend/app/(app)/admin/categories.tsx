import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { CategoryManagementScreen } from '../../../src/screens/CategoryManagementScreen';

export default function AdminCategoriesRoute() {
  const { goBackOrReplace, session } = useAppNavigation();
  const { currentMemberId, fetchCategories } = session;

  if (!currentMemberId) {
    return null;
  }

  return (
    <AppScreenShell fullWidth>
      <CategoryManagementScreen
        currentMemberId={currentMemberId}
        onBack={() => {
          void fetchCategories();
          goBackOrReplace('/admin');
        }}
      />
    </AppScreenShell>
  );
}
