import type { Athlete, ImportedEvent, IndividualEntry, RelayEntry } from "../types";
import { uniqueEventOptions } from "./ev3";
import { countByKey, individualEntryKey, relayEntryKey } from "./entryKeys";
import { athleteFullName } from "../utils/athleteMatch";

export interface EventSummaryEntry {
  key: string;
  label: string;
  detail?: string;
  seedTime: string;
  duplicate: boolean;
}

export interface EventSummaryGroup {
  eventNumber: number;
  displayName: string;
  relay: boolean;
  entryLimit: number;
  overLimit: boolean;
  entries: EventSummaryEntry[];
}

/**
 * Groups individual and relay entries by event (in meet event-number order),
 * for an at-a-glance review of what each event looks like — empty events,
 * over-the-limit events, and duplicate athlete/relay-letter entries are all
 * visible without cross-referencing the flat entry grids. Mirrors the
 * dedup-by-displayName semantics `uniqueEventOptions` uses for event options
 * elsewhere (an event with separate prelim/final EV3 rows is one group here).
 */
export function buildEventSummary(
  importedEvents: ImportedEvent[],
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
): EventSummaryGroup[] {
  const athleteNameById = new Map(athletes.map((a) => [a.id, athleteFullName(a)]));
  const eventNumberByName = new Map<string, number>();
  for (const event of importedEvents) {
    if (!eventNumberByName.has(event.displayName)) {
      eventNumberByName.set(event.displayName, event.eventNumber);
    }
  }

  const individualDupCounts = countByKey(individualEntries, individualEntryKey);
  const relayDupCounts = countByKey(relayEntries, relayEntryKey);

  const individualGroups: EventSummaryGroup[] = uniqueEventOptions(importedEvents, false).map(
    (option) => {
      const entries: EventSummaryEntry[] = individualEntries
        .filter((e) => e.event === option.name)
        .map((e) => ({
          key: e.id,
          label: athleteNameById.get(e.athleteId) || "(no athlete)",
          seedTime: e.seedTime,
          duplicate: (individualDupCounts.get(individualEntryKey(e) ?? "") ?? 0) > 1,
        }));
      return {
        eventNumber: eventNumberByName.get(option.name) ?? 0,
        displayName: option.name,
        relay: false,
        entryLimit: option.entryLimit,
        overLimit: option.entryLimit > 0 && entries.length > option.entryLimit,
        entries,
      };
    },
  );

  const relayGroups: EventSummaryGroup[] = uniqueEventOptions(importedEvents, true).map(
    (option) => {
      const entries: EventSummaryEntry[] = relayEntries
        .filter((e) => e.event === option.name)
        .map((e) => {
          const legNames = [e.leg1AthleteId, e.leg2AthleteId, e.leg3AthleteId, e.leg4AthleteId].map(
            (athleteId) => (athleteId ? athleteNameById.get(athleteId) || "(unknown)" : "—"),
          );
          return {
            key: e.id,
            label: `Relay ${e.relayLetter || "?"}`,
            detail: legNames.join(", "),
            seedTime: e.seedTime,
            duplicate: (relayDupCounts.get(relayEntryKey(e) ?? "") ?? 0) > 1,
          };
        });
      return {
        eventNumber: eventNumberByName.get(option.name) ?? 0,
        displayName: option.name,
        relay: true,
        entryLimit: option.entryLimit,
        overLimit: option.entryLimit > 0 && entries.length > option.entryLimit,
        entries,
      };
    },
  );

  return [...individualGroups, ...relayGroups].sort((a, b) => a.eventNumber - b.eventNumber);
}
