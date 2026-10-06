import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import type {
  Athlete,
  AthleteEventLimits,
  ImportedEvent,
  IndividualEntry,
  RelayEntry,
} from "../types";
import type { EventOption } from "../domain/ev3";
import EditableDataGrid from "./EditableDataGrid";
import EntryGridToolbar from "./EntryGridToolbar";
import BulkAddEntriesDialog from "./BulkAddEntriesDialog";
import CsvImportDialog, { type CsvImportColumn } from "./CsvImportDialog";
import CsvExportDialog from "./CsvExportDialog";
import ImportEntriesFromMeetDialog, { type EntryLabelContext } from "./ImportEntriesFromMeetDialog";
import { useSeedTimeColumn } from "../hooks/useSeedTimeColumn";
import { relayEntryKey } from "../domain/entryKeys";
import { buildAthleteOverLimitDetailById } from "../domain/athleteEventLimits";
import {
  buildRelayCrossEventDetail,
  buildRelaySelfDuplicateDetail,
} from "../domain/relayAthleteWarnings";
import {
  athleteOverLimitBadgeProvider,
  buildAthleteCsvColumn,
  buildAthleteNameById,
  buildAthleteOptions,
  buildEventColumn,
  buildEventCsvColumn,
  buildSeedTimeColumn,
  buildSeedTimeCsvColumn,
  duplicateBadgeProvider,
  relayAthleteWarningBadgeProvider,
  withCellBadges,
} from "../utils/entryGridShared";

const RELAY_LETTERS = ["A", "B", "C", "D"];

const describeRelayEntry = (entry: RelayEntry, ctx: EntryLabelContext): string => {
  const legs = [entry.leg1AthleteId, entry.leg2AthleteId, entry.leg3AthleteId, entry.leg4AthleteId]
    .filter(Boolean)
    .map((id) => ctx.athleteNameById.get(id) ?? "Unknown Athlete");
  const eventName = ctx.eventNameByNumber.get(entry.event) ?? "No Event";
  return `${eventName} ${entry.relayLetter}${legs.length ? ` — ${legs.join(", ")}` : ""}`;
};

interface RelayEntriesGridProps {
  meetId: string;
  entries: RelayEntry[];
  athletes: Athlete[];
  allAthletes: Athlete[];
  otherMeets: { id: string; name: string; importedEventsRaw?: string }[];
  allRelayEntries: RelayEntry[];
  individualEntries: IndividualEntry[];
  athleteEventLimits?: Partial<AthleteEventLimits>;
  entryLimit?: number;
  eventOptions?: EventOption[];
  importedEvents?: ImportedEvent[];
  onAdd: () => void;
  onBulkAdd: (count: number, eventNumbers: number[]) => void;
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
  onImportFromMeet: (sourceMeetId: string, entryIds: string[]) => void;
  onUpdate: (entry: RelayEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReorder: (orderedIds: string[]) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function RelayEntriesGrid({
  meetId,
  entries,
  athletes,
  allAthletes,
  otherMeets,
  allRelayEntries,
  individualEntries,
  athleteEventLimits,
  entryLimit,
  eventOptions,
  importedEvents,
  onAdd,
  onBulkAdd,
  onImportCsv,
  onImportFromMeet,
  onUpdate,
  onDelete,
  onClearAll,
  onReorder,
  readOnly,
  onReadOnlyAttempt,
}: RelayEntriesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [importFromMeetOpen, setImportFromMeetOpen] = useState(false);
  const {
    processRow: processSeedTimeRow,
    snackbar: seedTimeSnackbar,
    notifyBlockedEdit,
  } = useSeedTimeColumn<RelayEntry>(importedEvents);

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
  const athleteOverLimitDetailById = buildAthleteOverLimitDetailById(
    athletes,
    individualEntries,
    entries,
    athleteEventLimits,
  );
  const eventNameByNumber = new Map(
    (importedEvents ?? []).map((e) => [e.eventNumber, e.displayName]),
  );
  const relaySelfDuplicateDetail = buildRelaySelfDuplicateDetail(entries, athleteNameById);
  const relayCrossEventDetail = buildRelayCrossEventDetail(
    entries,
    athleteNameById,
    eventNameByNumber,
  );

  const legColumn = (
    field: "leg1AthleteId" | "leg2AthleteId" | "leg3AthleteId" | "leg4AthleteId",
    headerName: string,
  ): GridColDef<RelayEntry> =>
    withCellBadges<RelayEntry>(
      {
        field,
        headerName,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: athleteOptions,
      },
      [
        athleteOverLimitBadgeProvider([field], athleteOverLimitDetailById),
        relayAthleteWarningBadgeProvider(field, relaySelfDuplicateDetail),
        relayAthleteWarningBadgeProvider(field, relayCrossEventDetail),
      ],
    );

  const columns: GridColDef<RelayEntry>[] = [
    buildEventColumn<RelayEntry>(eventOptions, entries, entryLimit),
    withCellBadges<RelayEntry>(
      {
        field: "relayLetter",
        headerName: "Relay",
        width: 110,
        editable: true,
        type: "singleSelect",
        valueOptions: RELAY_LETTERS,
      },
      [
        duplicateBadgeProvider(
          entries,
          relayEntryKey,
          (row, count) =>
            `Relay ${row.relayLetter} is entered ${count} times for ${eventNameByNumber.get(row.event) ?? "this event"}`,
        ),
      ],
    ),
    legColumn("leg1AthleteId", "Athlete 1"),
    legColumn("leg2AthleteId", "Athlete 2"),
    legColumn("leg3AthleteId", "Athlete 3"),
    legColumn("leg4AthleteId", "Athlete 4"),
    buildSeedTimeColumn<RelayEntry>(importedEvents, notifyBlockedEdit),
  ];

  return (
    <>
      <EditableDataGrid
        rows={entries}
        columns={columns}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReorder={onReorder}
        processRow={processSeedTimeRow}
        storageKey={`${meetId}:relayEntries`}
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
            onImportFromMeet={() => setImportFromMeetOpen(true)}
            importFromMeetDisabled={otherMeets.length === 0}
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
      <ImportEntriesFromMeetDialog
        open={importFromMeetOpen}
        onClose={() => setImportFromMeetOpen(false)}
        title="Import Relay Entries from Another Meet"
        selectAllLabel="All Relay Entries"
        noEntriesLabel="This meet has no relay entries."
        meets={otherMeets}
        athletes={allAthletes}
        entries={allRelayEntries}
        describeEntry={describeRelayEntry}
        onImport={onImportFromMeet}
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
          eventNameByNumber.get(entry.event) ?? "",
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
