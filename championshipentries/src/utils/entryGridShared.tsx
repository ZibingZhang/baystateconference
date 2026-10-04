import type { ReactNode } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
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

/** Renders a singleSelect cell's text with optional trailing badges and the dropdown arrow, mirroring `withSelectIcon`'s layout. */
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
 * events whose entry count exceeds the meet's per-event entry limit (a
 * meet-wide setting, not something read from the EV3 file — see
 * `EventEntryLimits`) with a hazard icon, matching the warning style used
 * for duplicate entries and per-athlete event limits, so an over-limit
 * event is visible without needing to check the meet's actual roster.
 */
export function buildEventColumn<T extends { event: string }>(
  eventOptions: string[] | undefined,
  importedEvents: ImportedEvent[] | undefined,
  rows?: T[],
  entryLimit?: number,
): GridColDef<T> {
  const eventNumberByName = buildEventNumberByName(importedEvents);
  const countByEvent = countByKey(rows ?? [], (row) => row.event || undefined);
  const limit = entryLimit ?? 0;
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
      const overLimit = limit > 0 && count > limit;
      const badge = overLimit ? (
        <Tooltip title={`${count} entries exceeds the limit of ${limit} for this event`}>
          <WarningAmberIcon fontSize="small" sx={{ color: "error.main" }} />
        </Tooltip>
      ) : undefined;
      return renderSelectCellValue(value, editable, badge);
    },
  };
}

/** Renders one or more warning messages as a single tooltip: plain text for one, a bulleted list for several. */
export function warningTooltip(messages: string[]): ReactNode {
  if (messages.length <= 1) return messages[0];
  return (
    <Box component="ul" sx={{ m: 0, pl: 2 }}>
      {messages.map((message, i) => (
        <li key={i}>{message}</li>
      ))}
    </Box>
  );
}

/**
 * Wraps a singleSelect column so it shows a single warning icon when any
 * badge provider flags the row — e.g. a duplicate entry and an over-limit
 * athlete on the same cell are consolidated into one icon, hovering lists
 * both reasons.
 */
export function withCellBadges<T extends { id: string }>(
  column: GridColDef<T>,
  badgeProviders: Array<(row: T) => string | undefined>,
): GridColDef<T> {
  const editable = Boolean(column.editable);
  return {
    ...column,
    renderCell: (params) => {
      const value = params.formattedValue as string;
      const messages = badgeProviders
        .map((provider) => provider(params.row))
        .filter((message): message is string => message !== undefined);
      const badge =
        messages.length > 0 ? (
          <Tooltip title={warningTooltip(messages)}>
            <WarningAmberIcon fontSize="small" sx={{ color: "error.main" }} />
          </Tooltip>
        ) : undefined;
      return renderSelectCellValue(value, editable, badge);
    },
  };
}

/** Badge provider flagging a row whose `keyFn` value repeats among `rows` — e.g. the same athlete entered twice in the same event, or the same relay letter used twice in the same event. */
export function duplicateBadgeProvider<T>(
  rows: T[],
  keyFn: (row: T) => string | undefined,
  message: (row: T, count: number) => string,
): (row: T) => string | undefined {
  const countByDupKey = countByKey(rows, keyFn);
  return (row) => {
    const key = keyFn(row);
    const count = key !== undefined ? (countByDupKey.get(key) ?? 0) : 0;
    return count > 1 ? message(row, count) : undefined;
  };
}

/** Badge provider flagging a row whose athlete id (one or more fields, for relay legs) is over one of the meet's per-athlete event limits. */
export function athleteOverLimitBadgeProvider<T>(
  athleteIdFields: (keyof T)[],
  overLimitDetailByAthleteId: Map<string, string>,
): (row: T) => string | undefined {
  return (row) => {
    const details = athleteIdFields
      .map((field) => row[field] as unknown as string)
      .filter(Boolean)
      .map((athleteId) => overLimitDetailByAthleteId.get(athleteId))
      .filter((detail): detail is string => detail !== undefined);
    return details.length > 0 ? details.join("; ") : undefined;
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
