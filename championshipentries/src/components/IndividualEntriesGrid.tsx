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
import { useSeedTimeColumn } from "../hooks/useSeedTimeColumn";
import { individualEntryKey } from "../domain/entryKeys";
import { buildAthleteOverLimitDetailById } from "../domain/athleteEventLimits";
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
  withCellBadges,
} from "../utils/entryGridShared";

interface IndividualEntriesGridProps {
  meetId: string;
  entries: IndividualEntry[];
  athletes: Athlete[];
  relayEntries: RelayEntry[];
  athleteEventLimits?: Partial<AthleteEventLimits>;
  entryLimit?: number;
  eventOptions?: EventOption[];
  importedEvents?: ImportedEvent[];
  onAdd: () => void;
  onBulkAdd: (count: number, eventNumbers: number[]) => void;
  onImportCsv: (rows: { event: string; athleteId: string; seedTime: string }[]) => void;
  onUpdate: (entry: IndividualEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReorder: (orderedIds: string[]) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function IndividualEntriesGrid({
  meetId,
  entries,
  athletes,
  relayEntries,
  athleteEventLimits,
  entryLimit,
  eventOptions,
  importedEvents,
  onAdd,
  onBulkAdd,
  onImportCsv,
  onUpdate,
  onDelete,
  onClearAll,
  onReorder,
  readOnly,
  onReadOnlyAttempt,
}: IndividualEntriesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const {
    processRow: processSeedTimeRow,
    snackbar: seedTimeSnackbar,
    notifyBlockedEdit,
  } = useSeedTimeColumn<IndividualEntry>(importedEvents);

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
  const athleteOverLimitDetailById = buildAthleteOverLimitDetailById(
    athletes,
    entries,
    relayEntries,
    athleteEventLimits,
  );
  const eventNameByNumber = new Map(
    (importedEvents ?? []).map((e) => [e.eventNumber, e.displayName]),
  );

  const columns: GridColDef<IndividualEntry>[] = [
    buildEventColumn<IndividualEntry>(eventOptions, entries, entryLimit),
    withCellBadges<IndividualEntry>(
      {
        field: "athleteId",
        headerName: "Athlete",
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: athleteOptions,
      },
      [
        duplicateBadgeProvider(
          entries,
          individualEntryKey,
          (row, count) =>
            `${athleteNameById.get(row.athleteId) ?? "This athlete"} is entered in ${eventNameByNumber.get(row.event) ?? "this event"} ${count} times`,
        ),
        athleteOverLimitBadgeProvider(["athleteId"], athleteOverLimitDetailById),
      ],
    ),
    buildSeedTimeColumn<IndividualEntry>(importedEvents, notifyBlockedEdit),
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
        storageKey={`${meetId}:individualEntries`}
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
          eventNameByNumber.get(entry.event) ?? "",
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
