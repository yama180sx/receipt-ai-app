import React from 'react';
import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { GlobalAiBudgetScreen } from '../../../src/screens/GlobalAiBudgetScreen';
export default function GlobalAiBudgetRoute() { const { goBackOrReplace } = useAppNavigation(); return <AppScreenShell fullWidth><GlobalAiBudgetScreen onBack={() => goBackOrReplace('/admin')} /></AppScreenShell>; }
