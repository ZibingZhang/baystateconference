import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import Button from "@mui/material/Button";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import type { Athlete, ImportedEvent, RelayEntry } from "../types";
import EditableDataGrid from "./EditableDataGrid";
import BulkAddEntriesDialog from "./BulkAddEntriesDialog";
import CsvImportDialog, { type CsvImportColumn } from "./CsvImportDialog";
import CsvExportDialog from "./CsvExportDialog";
import { useSeedTimeColumn } from "./useSeedTimeColumn";
import { normalizeSeedTime } from "../seedTime";
import { athleteNameMatchError, findAthleteIdByName } from "../athleteMatch";

const NO_EVENTS_TOOLTIP = "Import an EV3 events file on the Events tab before choosing an event.";

const RELAY_LETTERS = ["A", "B", "C", "D"];

function matchEventName(value: string, options: string[]): string | undefined {
  const target = value.toLowerCase();
  return options.find((option) => option.toLowerCase() === target);
}

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

  const eventNumberByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of importedEvents ?? []) {
      if (!map.has(event.displayName)) {
        map.set(event.displayName, event.eventNumber);
      }
    }
    return map;
  }, [importedEvents]);

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

  const athleteOptions = athletes
    .filter((a) => `${a.firstName} ${a.lastName}`.trim() !== "")
    .map((a) => ({
      value: a.id,
      label: `${a.firstName} ${a.lastName}`.trim(),
    }));

  const athleteNameById = new Map(
    athletes.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
  );

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
    {
      field: "event",
      headerName: "Event",
      flex: 1,
      editable: (eventOptions?.length ?? 0) > 0,
      type: "singleSelect",
      valueOptions: eventOptions ?? [],
      description: eventOptions?.length ? undefined : NO_EVENTS_TOOLTIP,
      sortComparator: (v1, v2) =>
        (eventNumberByName.get(v1) ?? Number.MAX_SAFE_INTEGER) -
        (eventNumberByName.get(v2) ?? Number.MAX_SAFE_INTEGER),
    },
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
          <>
            <Button
              size="small"
              startIcon={<PlaylistAddIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : setBulkAddOpen(true))}
              disabled={!readOnly && !eventOptions?.length}
            >
              Bulk Add Relays
            </Button>
            <Button
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : setCsvImportOpen(true))}
              disabled={!readOnly && !eventOptions?.length}
            >
              Import CSV
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => setCsvExportOpen(true)}
              disabled={entries.length === 0}
            >
              Export CSV
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : onClearAll())}
              disabled={!readOnly && entries.length === 0}
            >
              Clear All
            </Button>
          </>
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
