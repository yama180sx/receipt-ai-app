import React from 'react';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../src/features/app/hooks/useAppNavigation';
import { PromptEditorScreen } from '../../../src/screens/PromptEditorScreen';

export default function AdminPromptsRoute() {
  const { goBackOrReplace } = useAppNavigation();

  return (
    <AppScreenShell fullWidth>
      <PromptEditorScreen onBack={() => goBackOrReplace('/admin')} />
    </AppScreenShell>
  );
}
