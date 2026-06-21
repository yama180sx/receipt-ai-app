import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { ProductMasterScreen } from '../../../src/screens/ProductMasterScreen';

export default function AdminProductMasterRoute() {
  const { goBackOrReplace, session } = useAppNavigation();
  const { currentMemberId } = session;

  if (!currentMemberId) {
    return null;
  }

  return (
    <AppScreenShell fullWidth>
      <ProductMasterScreen
        currentMemberId={currentMemberId}
        onBack={() => goBackOrReplace('/admin')}
      />
    </AppScreenShell>
  );
}
