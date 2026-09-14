import { useState } from "react";

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

interface InfoDialogState {
  title: string;
  message: string;
}

/**
 * Shared confirm/info dialog state used by every action hook (meet, athlete,
 * entry, template) to ask for confirmation before a destructive change or to
 * surface an error/notice.
 */
export function useDialogState() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [infoDialog, setInfoDialog] = useState<InfoDialogState | null>(null);

  return {
    confirmDialog,
    showConfirm: (dialog: ConfirmDialogState) => setConfirmDialog(dialog),
    closeConfirm: () => setConfirmDialog(null),
    infoDialog,
    showInfo: (dialog: InfoDialogState) => setInfoDialog(dialog),
    closeInfo: () => setInfoDialog(null),
  };
}
