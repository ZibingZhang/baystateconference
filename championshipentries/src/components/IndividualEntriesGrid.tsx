import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import type { Athlete, ImportedEvent, IndividualEntry } from "../types";
import EditableDataGrid from "./EditableDataGrid";
import GridActionsToolbar from "./GridActionsToolbar";
import BulkAddEntriesDialog from "./BulkAddEntriesDialog";
import CsvImportDialog, { type CsvImportColumn } from "./CsvImportDialog";
import CsvExportDialog from "./CsvExportDialog";
import { useSeedTimeColumn } from "../hooks/useSeedTimeColumn";
import { normalizeSeedTime } from "../seedTime";
import { athleteNameMatchError, findAthleteIdByName } from "../athleteMatch";
import {
  buildAthleteNameById,
  buildAthleteOptions,
  buildEventColumn,
  buildEventNumberByName,
  matchEventName,
} from "../entryGridShared";

interface IndividualEntriesGridProps {
  entries: IndividualEntry[];
  athletes: Athlete[];
  eventOptions?: string[];
  importedEvents?: ImportedEvent[];
  onAdd: () => void;
  onBulkAdd: (count: number, eventNames: string[]) => void;
  onImportCsv: (rows: { event: string; athleteId: string; seedTime: string }[]) => void;
  onUpdate: (entry: IndividualEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function IndividualEntriesGrid({
  entries,
  athletes,
  eventOptions,
  importedEvents,
  onAdd,
  onBulkAdd,
  onImportCsv,
  onUpdate,
  onDelete,
  onClearAll,
  readOnly,
  onReadOnlyAttempt,
}: IndividualEntriesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const { processRow: processSeedTimeRow, snackbar: seedTimeSnackbar } =
    useSeedTimeColumn<IndividualEntry>();

  const eventNumberByName = useMemo(() => buildEventNumberByName(importedEvents), [importedEvents]);

  const csvColumns: CsvImportColumn[] = useMemo(
    () => [
      {
        key: "event",
        label: "Event",
        validate: (value) =>
          matchEventName(value, eventOptions ?? []) !== undefined
            ? undefined
            : "Event does not match an imported event name.",
        transform: (value) => matchEventName(value, eventOptions ?? []) ?? value,
      },
      {
        key: "athleteId",
        label: "Athlete",
        validate: (value) => athleteNameMatchError(value, athletes),
        transform: (value) => findAthleteIdByName(value, athletes) ?? "",
      },
      {
        key: "seedTime",
        label: "Seed Time",
        validate: (value) =>
          value === "" || normalizeSeedTime(value) !== undefined
            ? undefined
            : "Invalid seed time — must be M:SS.hh or SS.hh.",
        transform: (value) => normalizeSeedTime(value) ?? "",
      },
    ],
    [eventOptions, athletes],
  );

  const athleteOptions = buildAthleteOptions(athletes);
  const athleteNameById = buildAthleteNameById(athletes);

  const columns: GridColDef<IndividualEntry>[] = [
    buildEventColumn<IndividualEntry>(eventOptions, eventNumberByName),
    {
      field: "athleteId",
      headerName: "Athlete",
      flex: 1,
      editable: true,
      type: "singleSelect",
      valueOptions: athleteOptions,
    },
    { field: "seedTime", headerName: "Seed Time", flex: 1, editable: true },
  ];

  return (
    <>
      <EditableDataGrid
        rows={entries}
        columns={columns}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        processRow={processSeedTimeRow}
        addLabel="Add Entry"
        noRowsLabel="No entries"
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <GridActionsToolbar
            addLabel="Bulk Add Entries"
            addIcon={<PlaylistAddIcon />}
            onAdd={() => setBulkAddOpen(true)}
            addDisabled={!eventOptions?.length}
            onImportCsv={() => setCsvImportOpen(true)}
            importDisabled={!eventOptions?.length}
            onExportCsv={() => setCsvExportOpen(true)}
            exportDisabled={entries.length === 0}
            onClearAll={onClearAll}
            clearAllDisabled={entries.length === 0}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        }
      />
      <BulkAddEntriesDialog
        open={bulkAddOpen}
        title="Bulk Add Individual Entries"
        events={importedEvents}
        relay={false}
        onClose={() => setBulkAddOpen(false)}
        onAdd={onBulkAdd}
      />
      <CsvImportDialog
        open={csvImportOpen}
        title="Import Individual Entries CSV"
        columns={csvColumns}
        onClose={() => setCsvImportOpen(false)}
        onImport={(rows) =>
          onImportCsv(rows as { event: string; athleteId: string; seedTime: string }[])
        }
      />
      <CsvExportDialog
        open={csvExportOpen}
        title="Export Individual Entries CSV"
        fileNamePrefix="Individual Entries"
        headers={["Event", "Athlete", "Seed Time"]}
        rows={entries.map((entry) => [
          entry.event,
          athleteNameById.get(entry.athleteId) ?? "",
          entry.seedTime,
        ])}
        onClose={() => setCsvExportOpen(false)}
      />
      {seedTimeSnackbar}
    </>
  );
}

export default IndividualEntriesGrid;
