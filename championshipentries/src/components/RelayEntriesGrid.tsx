import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import type { Athlete, ImportedEvent, RelayEntry } from "../types";
import EditableDataGrid from "./EditableDataGrid";
import GridActionsToolbar from "./GridActionsToolbar";
import BulkAddEntriesDialog from "./BulkAddEntriesDialog";
import CsvImportDialog, { type CsvImportColumn } from "./CsvImportDialog";
import CsvExportDialog from "./CsvExportDialog";
import { useSeedTimeColumn } from "./useSeedTimeColumn";
import { normalizeSeedTime } from "../seedTime";
import { athleteNameMatchError, findAthleteIdByName } from "../athleteMatch";
import {
  buildAthleteNameById,
  buildAthleteOptions,
  buildEventColumn,
  buildEventNumberByName,
  matchEventName,
} from "../entryGridShared";

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

  const eventNumberByName = useMemo(
    () => buildEventNumberByName(importedEvents),
    [importedEvents],
  );

  const csvColumns: CsvImportColumn[] = useMemo(() => {
    const legCsvColumn = (key: string, label: string): CsvImportColumn => ({
      key,
      label,
      validate: (value) => athleteNameMatchError(value, athletes),
      transform: (value) => findAthleteIdByName(value, athletes) ?? "",
    });

    return [
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
        key: "relayLetter",
        label: "Relay",
        validate: (value) =>
          RELAY_LETTERS.includes(value.toUpperCase())
            ? undefined
            : `Relay must be one of ${RELAY_LETTERS.join(", ")}.`,
        transform: (value) => value.toUpperCase(),
      },
      legCsvColumn("leg1AthleteId", "Athlete 1"),
      legCsvColumn("leg2AthleteId", "Athlete 2"),
      legCsvColumn("leg3AthleteId", "Athlete 3"),
      legCsvColumn("leg4AthleteId", "Athlete 4"),
      {
        key: "seedTime",
        label: "Seed Time",
        validate: (value) =>
          value === "" || normalizeSeedTime(value) !== undefined
            ? undefined
            : "Invalid seed time — must be M:SS.hh or SS.hh.",
        transform: (value) => normalizeSeedTime(value) ?? "",
      },
    ];
  }, [eventOptions, athletes]);

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
    buildEventColumn<RelayEntry>(eventOptions, eventNumberByName),
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
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <GridActionsToolbar
            addLabel="Bulk Add Relays"
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
