import type { ReactNode } from "react";
import type { EventOption } from "../domain/ev3";
import GridActionsToolbar from "./GridActionsToolbar";

interface EntryGridToolbarProps {
  addLabel: string;
  addIcon: ReactNode;
  eventOptions: EventOption[] | undefined;
  entriesCount: number;
  onAdd: () => void;
  onImportCsv: () => void;
  onImportFromMeet?: () => void;
  importFromMeetDisabled?: boolean;
  onExportCsv: () => void;
  onClearAll: () => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

/**
 * `GridActionsToolbar` for the relay/individual entry grids, fixing the
 * disabled-state rules both share: add/import require an imported events
 * file, export/clear-all require at least one entry.
 */
function EntryGridToolbar({
  addLabel,
  addIcon,
  eventOptions,
  entriesCount,
  onAdd,
  onImportCsv,
  onImportFromMeet,
  importFromMeetDisabled,
  onExportCsv,
  onClearAll,
  readOnly,
  onReadOnlyAttempt,
}: EntryGridToolbarProps) {
  return (
    <GridActionsToolbar
      addLabel={addLabel}
      addIcon={addIcon}
      onAdd={onAdd}
      addDisabled={!eventOptions?.length}
      onImportCsv={onImportCsv}
      importDisabled={!eventOptions?.length}
      onImportFromMeet={onImportFromMeet}
      importFromMeetDisabled={importFromMeetDisabled}
      onExportCsv={onExportCsv}
      exportDisabled={entriesCount === 0}
      onClearAll={onClearAll}
      clearAllDisabled={entriesCount === 0}
      readOnly={readOnly}
      onReadOnlyAttempt={onReadOnlyAttempt}
    />
  );
}

export default EntryGridToolbar;
