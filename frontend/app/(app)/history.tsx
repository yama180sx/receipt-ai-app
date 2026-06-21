import React from 'react';

import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import {
  setPendingSplitReceipt,
  splitEditorPath,
} from '../../src/features/app/navigation/splitEditorNavigation';
import HistoryScreen from '../../src/screens/HistoryScreen';
import type { ReceiptForSplitEditor } from '../../src/types/settlement';

export default function HistoryRoute() {
  const { router, goBackOrHome, session } = useAppNavigation();
  const { currentMemberId } = session;

  if (!currentMemberId) {
    return null;
  }

  const handleGoToSplitEditor = (receipt: ReceiptForSplitEditor) => {
    setPendingSplitReceipt(receipt);
    router.push(splitEditorPath(receipt.id));
  };

  return (
    <AppScreenShell fullWidth>
      <HistoryScreen
        currentMemberId={currentMemberId}
        onBack={goBackOrHome}
        onGoToSplitEditor={handleGoToSplitEditor}
      />
    </AppScreenShell>
  );
}
