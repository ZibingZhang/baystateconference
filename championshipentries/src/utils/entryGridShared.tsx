import type { ReactNode } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { Athlete, ImportedEvent } from "../types";
import { athleteFullName, athleteNameMatchError, findAthleteIdByName } from "./athleteMatch";
import { normalizeSeedTime } from "./seedTime";
import { eventByDisplayName, validateSeedTime } from "../domain/ev3";
import { countByKey } from "../domain/entryKeys";
import type { CsvImportColumn } from "../components/CsvImportDialog";
import SeedTimeEditCell from "../components/SeedTimeEditCell";

export const NO_EVENTS_TOOLTIP =
  "Import an EV3 events file on the Events tab before choosing an event.";

export function matchEventName(value: string, options: string[]): string | undefined {
  const target = value.toLowerCase();
  return options.find((option) => option.toLowerCase() === target);
}

function buildEventNumberByName(importedEvents: ImportedEvent[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  for (const event of importedEvents ?? []) {
    if (!map.has(event.displayName)) {
      map.set(event.displayName, event.eventNumber);
    }
  }
  return map;
}

export function buildAthleteOptions(athletes: Athlete[]): { value: string; label: string }[] {
  return athletes
    .filter((a) => athleteFullName(a) !== "")
    .map((a) => ({ value: a.id, label: athleteFullName(a) }));
}

export function buildAthleteNameById(athletes: Athlete[]): Map<string, string> {
  return new Map(athletes.map((a) => [a.id, athleteFullName(a)]));
}

/** Renders a singleSelect cell's text with an optional trailing badge and the dropdown arrow, mirroring `withSelectIcon`'s layout. */
function renderSelectCellValue(value: string, editable: boolean, badge?: ReactNode) {
  return (
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
        {value}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {badge}
        {editable && <ArrowDropDownIcon fontSize="small" sx={{ color: "action.active" }} />}
      </Box>
    </Box>
  );
}

/**
 * Event column shared by the entries grids. When `rows` is supplied, flags
 * events whose entry count exceeds the imported EV3 entryLimit (the per-team
 * cap) with a red count chip, so an over-limit event is visible without
 * needing to check the meet's actual roster.
 */
export function buildEventColumn<T extends { event: string }>(
  eventOptions: string[] | undefined,
  importedEvents: ImportedEvent[] | undefined,
  rows?: T[],
): GridColDef<T> {
  const eventNumberByName = buildEventNumberByName(importedEvents);
  const eventsByName = eventByDisplayName(importedEvents ?? []);
  const countByEvent = countByKey(rows ?? [], (row) => row.event || undefined);
  const editable = (eventOptions?.length ?? 0) > 0;
  return {
    field: "event",
    headerName: "Event",
    flex: 1,
    editable,
    type: "singleSelect",
    valueOptions: eventOptions ?? [],
    description: eventOptions?.length ? undefined : NO_EVENTS_TOOLTIP,
    sortComparator: (v1, v2) =>
      (eventNumberByName.get(v1) ?? Number.MAX_SAFE_INTEGER) -
      (eventNumberByName.get(v2) ?? Number.MAX_SAFE_INTEGER),
    renderCell: (params) => {
      const value = params.formattedValue as string;
      const count = countByEvent.get(value) ?? 0;
      const limit = eventsByName.get(value)?.entryLimit ?? 0;
      const overLimit = limit > 0 && count > limit;
      const badge = overLimit ? (
        <Tooltip title={`${count} entries exceeds the limit of ${limit} for this event`}>
          <Chip
            label={count}
            size="small"
            color="error"
            sx={{ height: 18, "& .MuiChip-label": { px: 0.75 } }}
          />
        </Tooltip>
      ) : undefined;
      return renderSelectCellValue(value, editable, badge);
    },
  };
}

/**
 * Wraps a singleSelect column so it shows a red warning icon when its row's
 * `keyFn` value repeats among `rows` — e.g. the same athlete entered twice in
 * the same event, or the same relay letter used twice in the same event.
 */
export function withDuplicateBadge<T extends { id: string }>(
  column: GridColDef<T>,
  rows: T[],
  keyFn: (row: T) => string | undefined,
  tooltip: (row: T, count: number) => string,
): GridColDef<T> {
  const countByDupKey = countByKey(rows, keyFn);
  const editable = Boolean(column.editable);
  return {
    ...column,
    renderCell: (params) => {
      const key = keyFn(params.row);
      const count = key !== undefined ? (countByDupKey.get(key) ?? 0) : 0;
      const value = params.formattedValue as string;
      const badge =
        count > 1 ? (
          <Tooltip title={tooltip(params.row, count)}>
            <WarningAmberIcon fontSize="small" sx={{ color: "error.main" }} />
          </Tooltip>
        ) : undefined;
      return renderSelectCellValue(value, editable, badge);
    },
  };
}

export function buildEventCsvColumn(eventOptions: string[] | undefined): CsvImportColumn {
  return {
    key: "event",
    label: "Event",
    validate: (value) =>
      matchEventName(value, eventOptions ?? []) !== undefined
        ? undefined
        : "Event does not match an imported event name.",
    transform: (value) => matchEventName(value, eventOptions ?? []) ?? value,
  };
}

/**
 * Builds the `seedTime` column shared by the entries grids: the cell is kept
 * in edit mode (via `preProcessEditCellProps`) whenever the current text
 * fails the format or the event's qualifying standard, instead of letting
 * Enter/Tab/blur commit it — `onBlockedCommit` is how the caller learns why,
 * so it can show a banner without the cell losing its place.
 */
export function buildSeedTimeColumn<T extends { seedTime: string; event: string }>(
  importedEvents: ImportedEvent[] | undefined,
  onBlockedCommit: (message: string, refocus: () => void) => void,
): GridColDef<T> {
  const eventsByName = eventByDisplayName(importedEvents ?? []);
  return {
    field: "seedTime",
    headerName: "Seed Time",
    flex: 1,
    editable: true,
    preProcessEditCellProps: (params) => {
      const event = eventsByName.get((params.row as T).event);
      const { errorMessage } = validateSeedTime(String(params.props.value ?? ""), event);
      return { ...params.props, error: Boolean(errorMessage), errorMessage };
    },
    renderEditCell: (params) => <SeedTimeEditCell {...params} onBlockedCommit={onBlockedCommit} />,
  };
}

export function buildSeedTimeCsvColumn(): CsvImportColumn {
  return {
    key: "seedTime",
    label: "Seed Time",
    validate: (value) =>
      value === "" || normalizeSeedTime(value) !== undefined
        ? undefined
        : "Invalid seed time — must be M:SS.hh or SS.hh.",
    transform: (value) => normalizeSeedTime(value) ?? "",
  };
}

export function buildAthleteCsvColumn(
  key: string,
  label: string,
  athletes: Athlete[],
): CsvImportColumn {
  return {
    key,
    label,
    validate: (value) => athleteNameMatchError(value, athletes),
    transform: (value) => findAthleteIdByName(value, athletes) ?? "",
  };
}
