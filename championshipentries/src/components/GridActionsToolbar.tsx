import { useState, type MouseEvent, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import GroupsIcon from "@mui/icons-material/Groups";
import DownloadIcon from "@mui/icons-material/Download";

interface GridActionsToolbarProps {
  addLabel: string;
  addIcon: ReactNode;
  onAdd: () => void;
  addDisabled?: boolean;
  onImportCsv: () => void;
  importDisabled?: boolean;
  /** When provided, the Import button opens a menu offering CSV import or this handler instead of importing CSV directly. */
  onImportFromMeet?: () => void;
  importFromMeetDisabled?: boolean;
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
  onImportFromMeet,
  importFromMeetDisabled,
  onExportCsv,
  exportDisabled,
  onClearAll,
  clearAllDisabled,
  readOnly,
  onReadOnlyAttempt,
}: GridActionsToolbarProps) {
  const [importMenuAnchor, setImportMenuAnchor] = useState<HTMLElement | null>(null);
  const gated = (fn: () => void) => () => (readOnly ? onReadOnlyAttempt?.() : fn());

  const handleImportClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (readOnly) {
      onReadOnlyAttempt?.();
      return;
    }
    if (onImportFromMeet) {
      setImportMenuAnchor(event.currentTarget);
    } else {
      onImportCsv();
    }
  };

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
        onClick={handleImportClick}
        disabled={!readOnly && importDisabled}
      >
        Import
      </Button>
      {onImportFromMeet && (
        <Menu
          anchorEl={importMenuAnchor}
          open={importMenuAnchor !== null}
          onClose={() => setImportMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setImportMenuAnchor(null);
              onImportCsv();
            }}
          >
            <ListItemIcon>
              <UploadFileIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>From CSV</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={importFromMeetDisabled}
            onClick={() => {
              setImportMenuAnchor(null);
              onImportFromMeet();
            }}
          >
            <ListItemIcon>
              <GroupsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>From Another Meet</ListItemText>
          </MenuItem>
        </Menu>
      )}
      <Button
        size="small"
        startIcon={<DownloadIcon />}
        onClick={onExportCsv}
        disabled={exportDisabled}
      >
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
