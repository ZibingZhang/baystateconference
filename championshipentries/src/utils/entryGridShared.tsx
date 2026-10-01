import type { GridColDef } from "@mui/x-data-grid";
import type { Athlete, ImportedEvent } from "../types";
import { athleteFullName, athleteNameMatchError, findAthleteIdByName } from "./athleteMatch";
import { normalizeSeedTime } from "./seedTime";
import { eventByDisplayName, validateSeedTime } from "../domain/ev3";
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

export function buildEventColumn<T extends { event: string }>(
  eventOptions: string[] | undefined,
  importedEvents: ImportedEvent[] | undefined,
): GridColDef<T> {
  const eventNumberByName = buildEventNumberByName(importedEvents);
  return {
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
