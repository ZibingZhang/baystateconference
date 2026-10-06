import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { Athlete, IndividualEntry, RelayEntry } from "../types";
import EditableDataGrid from "./EditableDataGrid";
import GridActionsToolbar from "./GridActionsToolbar";
import BulkAddAthletesDialog from "./BulkAddAthletesDialog";
import CsvImportDialog, { type CsvImportColumn } from "./CsvImportDialog";
import CsvExportDialog from "./CsvExportDialog";
import ImportAthletesFromMeetDialog from "./ImportAthletesFromMeetDialog";
import { athleteNameYearKey } from "../utils/athleteMatch";
import { duplicateBadgeProvider } from "../utils/entryGridShared";

interface AthletesGridProps {
  meetId: string;
  athletes: Athlete[];
  allAthletes: Athlete[];
  otherMeets: { id: string; name: string }[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
  onAdd: () => void;
  onBulkAdd: (count: number) => void;
  onImportCsv: (
    rows: { firstName: string; lastName: string; gender: string; classYear: string }[],
  ) => void;
  onImportFromMeet: (sourceMeetId: string, athleteIds: string[]) => void;
  onUpdate: (athlete: Athlete) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReorder: (orderedIds: string[]) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

type AthleteRow = Athlete & { individualEventCount: number; relayEventCount: number };

const GENDERS = ["G", "B", "W", "M"];
const GENDER_TOOLTIP = "G = Girl, B = Boy, W = Woman, M = Man";
const MIN_CLASS_YEAR = 2027;
const CLASS_YEAR_TOOLTIP = `Class year must be ${MIN_CLASS_YEAR} or later.`;
const CLASS_YEARS = Array.from(
  { length: new Date().getFullYear() + 10 - MIN_CLASS_YEAR + 1 },
  (_, i) => MIN_CLASS_YEAR + i,
);

// The label needs its own overflow/shrink handling (rather than relying on the
// DataGrid's default header truncation) so the info icon always keeps its
// space and stays hoverable, even when the sort arrow claims room on hover.
function HeaderWithInfo({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, overflow: "hidden", minWidth: 0 }}>
      <Box
        component="span"
        sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
      >
        {label}
      </Box>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon fontSize="inherit" sx={{ color: "action.active", flexShrink: 0 }} />
      </Tooltip>
    </Box>
  );
}

const SAME_NAME_AND_YEAR_TOOLTIP =
  "Another athlete has the same name and class year — verify these aren't duplicates";

/**
 * `nameYearBadge` is recomputed fresh from the current athlete list on every
 * render (see the `useMemo` in the component) rather than being baked into
 * each row as a stored field — a stored field would go stale the moment a
 * row is edited, since the grid's `processRowUpdate` echoes back the rest of
 * the previous row data verbatim alongside the one field that actually
 * changed.
 */
function buildColumns(
  nameYearBadge: (row: Athlete) => string | undefined,
): GridColDef<AthleteRow>[] {
  return [
    { field: "firstName", headerName: "First Name", flex: 1, editable: true },
    {
      field: "lastName",
      headerName: "Last Name",
      flex: 1,
      editable: true,
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            gap: 0.5,
          }}
        >
          <Box
            component="span"
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {params.value as string}
          </Box>
          {nameYearBadge(params.row) && (
            <Tooltip title={SAME_NAME_AND_YEAR_TOOLTIP}>
              <WarningAmberIcon fontSize="small" sx={{ color: "warning.main", flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "gender",
      headerName: "Gender",
      width: 100,
      editable: true,
      type: "singleSelect",
      valueOptions: GENDERS,
      renderHeader: () => <HeaderWithInfo label="Gender" tooltip={GENDER_TOOLTIP} />,
    },
    {
      field: "classYear",
      headerName: "Class Year",
      width: 120,
      editable: true,
      type: "singleSelect",
      valueOptions: CLASS_YEARS,
      renderHeader: () => <HeaderWithInfo label="Class Year" tooltip={CLASS_YEAR_TOOLTIP} />,
    },
    {
      field: "individualEventCount",
      headerName: "Individual Events",
      width: 130,
      type: "number",
    },
    {
      field: "relayEventCount",
      headerName: "Relay Events",
      width: 120,
      type: "number",
    },
  ];
}

const csvColumns: CsvImportColumn[] = [
  {
    key: "firstName",
    label: "First Name",
    validate: (value) => (value === "" ? "First name is required." : undefined),
  },
  {
    key: "lastName",
    label: "Last Name",
    validate: (value) => (value === "" ? "Last name is required." : undefined),
  },
  {
    key: "gender",
    label: "Gender",
    validate: (value) =>
      GENDERS.includes(value.toUpperCase())
        ? undefined
        : `Gender must be one of ${GENDERS.join(", ")}.`,
    transform: (value) => value.toUpperCase(),
  },
  {
    key: "classYear",
    label: "Class Year",
    validate: (value) => {
      const year = Number.parseInt(value, 10);
      return Number.isInteger(year) && year >= MIN_CLASS_YEAR ? undefined : CLASS_YEAR_TOOLTIP;
    },
  },
];

function AthletesGrid({
  meetId,
  athletes,
  allAthletes,
  otherMeets,
  individualEntries,
  relayEntries,
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
}: AthletesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [importFromMeetOpen, setImportFromMeetOpen] = useState(false);

  const rows = useMemo<AthleteRow[]>(() => {
    const individualCounts = new Map<string, number>();
    for (const entry of individualEntries) {
      individualCounts.set(entry.athleteId, (individualCounts.get(entry.athleteId) ?? 0) + 1);
    }
    const relayCounts = new Map<string, number>();
    for (const entry of relayEntries) {
      const legAthleteIds = new Set(
        [entry.leg1AthleteId, entry.leg2AthleteId, entry.leg3AthleteId, entry.leg4AthleteId].filter(
          Boolean,
        ),
      );
      for (const athleteId of legAthleteIds) {
        relayCounts.set(athleteId, (relayCounts.get(athleteId) ?? 0) + 1);
      }
    }
    return athletes.map((athlete) => ({
      ...athlete,
      individualEventCount: individualCounts.get(athlete.id) ?? 0,
      relayEventCount: relayCounts.get(athlete.id) ?? 0,
    }));
  }, [athletes, individualEntries, relayEntries]);

  const columns = useMemo(
    () =>
      buildColumns(
        duplicateBadgeProvider(athletes, athleteNameYearKey, () => SAME_NAME_AND_YEAR_TOOLTIP),
      ),
    [athletes],
  );

  return (
    <>
      <EditableDataGrid
        rows={rows}
        columns={columns}
        onAdd={onAdd}
        onUpdate={({ individualEventCount, relayEventCount, ...athlete }) => {
          void individualEventCount;
          void relayEventCount;
          onUpdate(athlete);
        }}
        onDelete={onDelete}
        onReorder={onReorder}
        storageKey={`${meetId}:athletes`}
        addLabel="Add Athlete"
        noRowsLabel="No athletes"
        itemLabelSingular="athlete"
        itemLabelPlural="athletes"
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <GridActionsToolbar
            addLabel="Bulk Add Athletes"
            addIcon={<GroupAddIcon />}
            onAdd={() => setBulkAddOpen(true)}
            onImportCsv={() => setCsvImportOpen(true)}
            onImportFromMeet={() => setImportFromMeetOpen(true)}
            importFromMeetDisabled={otherMeets.length === 0}
            onExportCsv={() => setCsvExportOpen(true)}
            exportDisabled={athletes.length === 0}
            onClearAll={onClearAll}
            clearAllDisabled={athletes.length === 0}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        }
      />
      <BulkAddAthletesDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onAdd={onBulkAdd}
      />
      <CsvImportDialog
        open={csvImportOpen}
        title="Import Athletes CSV"
        columns={csvColumns}
        onClose={() => setCsvImportOpen(false)}
        onImport={(rows) =>
          onImportCsv(
            rows as { firstName: string; lastName: string; gender: string; classYear: string }[],
          )
        }
      />
      <ImportAthletesFromMeetDialog
        open={importFromMeetOpen}
        onClose={() => setImportFromMeetOpen(false)}
        meets={otherMeets}
        athletes={allAthletes}
        onImport={onImportFromMeet}
      />
      <CsvExportDialog
        open={csvExportOpen}
        title="Export Athletes CSV"
        fileNamePrefix="Athletes"
        headers={["First Name", "Last Name", "Gender", "Class Year"]}
        rows={athletes.map((athlete) => [
          athlete.firstName,
          athlete.lastName,
          athlete.gender,
          athlete.classYear === null ? "" : String(athlete.classYear),
        ])}
        onClose={() => setCsvExportOpen(false)}
      />
    </>
  );
}

export default AthletesGrid;
