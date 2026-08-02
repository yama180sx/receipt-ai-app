import React from 'react';
import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { StandardProductClassificationRulesScreen } from '../../../src/screens/StandardProductClassificationRulesScreen';

export default function StandardProductClassificationRulesRoute() {
  const { goBackOrReplace } = useAppNavigation();
  return <AppScreenShell fullWidth><StandardProductClassificationRulesScreen onBack={() => goBackOrReplace('/admin')} /></AppScreenShell>;
}
