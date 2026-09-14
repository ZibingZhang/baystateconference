import type { GridColDef } from "@mui/x-data-grid";
import type { Athlete, ImportedEvent } from "../types";
import { athleteFullName } from "./athleteMatch";

export const NO_EVENTS_TOOLTIP =
  "Import an EV3 events file on the Events tab before choosing an event.";

export function matchEventName(value: string, options: string[]): string | undefined {
  const target = value.toLowerCase();
  return options.find((option) => option.toLowerCase() === target);
}

export function buildEventNumberByName(
  importedEvents: ImportedEvent[] | undefined,
): Map<string, number> {
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
  eventNumberByName: Map<string, number>,
): GridColDef<T> {
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
