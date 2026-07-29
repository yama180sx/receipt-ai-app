import React from 'react';
import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import ProductClassificationReviewScreen from '../../src/screens/ProductClassificationReviewScreen';

export default function ProductClassificationReviewRoute() {
  const { goBackOrHome } = useAppNavigation();
  return <AppScreenShell fullWidth><ProductClassificationReviewScreen onBack={goBackOrHome} /></AppScreenShell>;
}
