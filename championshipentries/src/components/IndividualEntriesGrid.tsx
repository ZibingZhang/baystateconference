import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import type { Athlete, ImportedEvent, IndividualEntry } from "../types";
import EditableDataGrid from "./EditableDataGrid";
import EntryGridToolbar from "./EntryGridToolbar";
import BulkAddEntriesDialog from "./BulkAddEntriesDialog";
import CsvImportDialog, { type CsvImportColumn } from "./CsvImportDialog";
import CsvExportDialog from "./CsvExportDialog";
import { useSeedTimeColumn } from "../hooks/useSeedTimeColumn";
import {
  buildAthleteCsvColumn,
  buildAthleteNameById,
  buildAthleteOptions,
  buildEventColumn,
  buildEventCsvColumn,
  buildSeedTimeCsvColumn,
} from "../utils/entryGridShared";

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

  const csvColumns: CsvImportColumn[] = useMemo(
    () => [
      buildEventCsvColumn(eventOptions),
      buildAthleteCsvColumn("athleteId", "Athlete", athletes),
      buildSeedTimeCsvColumn(),
    ],
    [eventOptions, athletes],
  );

  const athleteOptions = buildAthleteOptions(athletes);
  const athleteNameById = buildAthleteNameById(athletes);

  const columns: GridColDef<IndividualEntry>[] = [
    buildEventColumn<IndividualEntry>(eventOptions, importedEvents),
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
        itemLabelSingular="entry"
        itemLabelPlural="entries"
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <EntryGridToolbar
            addLabel="Bulk Add Entries"
            addIcon={<PlaylistAddIcon />}
            eventOptions={eventOptions}
            entriesCount={entries.length}
            onAdd={() => setBulkAddOpen(true)}
            onImportCsv={() => setCsvImportOpen(true)}
            onExportCsv={() => setCsvExportOpen(true)}
            onClearAll={onClearAll}
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
