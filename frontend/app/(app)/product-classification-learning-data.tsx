import React from 'react';
import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import ProductClassificationLearningDataScreen from '../../src/screens/ProductClassificationLearningDataScreen';

export default function ProductClassificationLearningDataRoute() {
  const { goBackOrHome } = useAppNavigation();
  return <AppScreenShell fullWidth><ProductClassificationLearningDataScreen onBack={goBackOrHome} /></AppScreenShell>;
}
