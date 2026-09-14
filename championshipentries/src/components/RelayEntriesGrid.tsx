import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import type { Athlete, ImportedEvent, RelayEntry } from "../types";
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

const RELAY_LETTERS = ["A", "B", "C", "D"];

interface RelayEntriesGridProps {
  entries: RelayEntry[];
  athletes: Athlete[];
  eventOptions?: string[];
  importedEvents?: ImportedEvent[];
  onAdd: () => void;
  onBulkAdd: (count: number, eventNames: string[]) => void;
  onImportCsv: (
    rows: {
      event: string;
      relayLetter: string;
      leg1AthleteId: string;
      leg2AthleteId: string;
      leg3AthleteId: string;
      leg4AthleteId: string;
      seedTime: string;
    }[],
  ) => void;
  onUpdate: (entry: RelayEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function RelayEntriesGrid({
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
}: RelayEntriesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const { processRow: processSeedTimeRow, snackbar: seedTimeSnackbar } =
    useSeedTimeColumn<RelayEntry>();

  const csvColumns: CsvImportColumn[] = useMemo(
    () => [
      buildEventCsvColumn(eventOptions),
      {
        key: "relayLetter",
        label: "Relay",
        validate: (value) =>
          RELAY_LETTERS.includes(value.toUpperCase())
            ? undefined
            : `Relay must be one of ${RELAY_LETTERS.join(", ")}.`,
        transform: (value) => value.toUpperCase(),
      },
      buildAthleteCsvColumn("leg1AthleteId", "Athlete 1", athletes),
      buildAthleteCsvColumn("leg2AthleteId", "Athlete 2", athletes),
      buildAthleteCsvColumn("leg3AthleteId", "Athlete 3", athletes),
      buildAthleteCsvColumn("leg4AthleteId", "Athlete 4", athletes),
      buildSeedTimeCsvColumn(),
    ],
    [eventOptions, athletes],
  );

  const athleteOptions = buildAthleteOptions(athletes);
  const athleteNameById = buildAthleteNameById(athletes);

  const legColumn = (
    field: "leg1AthleteId" | "leg2AthleteId" | "leg3AthleteId" | "leg4AthleteId",
    headerName: string,
  ): GridColDef<RelayEntry> => ({
    field,
    headerName,
    flex: 1,
    editable: true,
    type: "singleSelect",
    valueOptions: athleteOptions,
  });

  const columns: GridColDef<RelayEntry>[] = [
    buildEventColumn<RelayEntry>(eventOptions, importedEvents),
    {
      field: "relayLetter",
      headerName: "Relay",
      width: 90,
      editable: true,
      type: "singleSelect",
      valueOptions: RELAY_LETTERS,
    },
    legColumn("leg1AthleteId", "Athlete 1"),
    legColumn("leg2AthleteId", "Athlete 2"),
    legColumn("leg3AthleteId", "Athlete 3"),
    legColumn("leg4AthleteId", "Athlete 4"),
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
        addLabel="Add Relay"
        noRowsLabel="No entries"
        itemLabelSingular="entry"
        itemLabelPlural="entries"
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <EntryGridToolbar
            addLabel="Bulk Add Relays"
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
        title="Bulk Add Relay Entries"
        events={importedEvents}
        relay={true}
        onClose={() => setBulkAddOpen(false)}
        onAdd={onBulkAdd}
      />
      <CsvImportDialog
        open={csvImportOpen}
        title="Import Relay Entries CSV"
        columns={csvColumns}
        onClose={() => setCsvImportOpen(false)}
        onImport={(rows) =>
          onImportCsv(
            rows as {
              event: string;
              relayLetter: string;
              leg1AthleteId: string;
              leg2AthleteId: string;
              leg3AthleteId: string;
              leg4AthleteId: string;
              seedTime: string;
            }[],
          )
        }
      />
      <CsvExportDialog
        open={csvExportOpen}
        title="Export Relay Entries CSV"
        fileNamePrefix="Relay Entries"
        headers={[
          "Event",
          "Relay",
          "Athlete 1",
          "Athlete 2",
          "Athlete 3",
          "Athlete 4",
          "Seed Time",
        ]}
        rows={entries.map((entry) => [
          entry.event,
          entry.relayLetter,
          athleteNameById.get(entry.leg1AthleteId) ?? "",
          athleteNameById.get(entry.leg2AthleteId) ?? "",
          athleteNameById.get(entry.leg3AthleteId) ?? "",
          athleteNameById.get(entry.leg4AthleteId) ?? "",
          entry.seedTime,
        ])}
        onClose={() => setCsvExportOpen(false)}
      />
      {seedTimeSnackbar}
    </>
  );
}

export default RelayEntriesGrid;
