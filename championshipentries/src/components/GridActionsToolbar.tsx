import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";

interface GridActionsToolbarProps {
  addLabel: string;
  addIcon: ReactNode;
  onAdd: () => void;
  addDisabled?: boolean;
  onImportCsv: () => void;
  importDisabled?: boolean;
  onExportCsv: () => void;
  exportDisabled: boolean;
  onClearAll: () => void;
  clearAllDisabled: boolean;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function GridActionsToolbar({
  addLabel,
  addIcon,
  onAdd,
  addDisabled,
  onImportCsv,
  importDisabled,
  onExportCsv,
  exportDisabled,
  onClearAll,
  clearAllDisabled,
  readOnly,
  onReadOnlyAttempt,
}: GridActionsToolbarProps) {
  const gated = (fn: () => void) => () => (readOnly ? onReadOnlyAttempt?.() : fn());
  return (
    <>
      <Button
        size="small"
        startIcon={addIcon}
        onClick={gated(onAdd)}
        disabled={!readOnly && addDisabled}
      >
        {addLabel}
      </Button>
      <Button
        size="small"
        startIcon={<UploadFileIcon />}
        onClick={gated(onImportCsv)}
        disabled={!readOnly && importDisabled}
      >
        Import CSV
      </Button>
      <Button size="small" startIcon={<DownloadIcon />} onClick={onExportCsv} disabled={exportDisabled}>
        Export CSV
      </Button>
      <Button
        size="small"
        color="error"
        startIcon={<DeleteSweepIcon />}
        onClick={gated(onClearAll)}
        disabled={!readOnly && clearAllDisabled}
      >
        Clear All
      </Button>
    </>
  );
}

export default GridActionsToolbar;
