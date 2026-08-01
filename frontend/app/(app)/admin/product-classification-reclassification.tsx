import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { ProductClassificationReclassificationScreen } from '../../../src/screens/ProductClassificationReclassificationScreen';

export default function ProductClassificationReclassificationRoute() {
  const { goBackOrReplace } = useAppNavigation();

  return (
    <AppScreenShell fullWidth>
      <ProductClassificationReclassificationScreen onBack={() => goBackOrReplace('/admin')} />
    </AppScreenShell>
  );
}
