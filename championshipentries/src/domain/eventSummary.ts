import type {
  Athlete,
  AthleteEventLimits,
  EventEntryLimits,
  ImportedEvent,
  IndividualEntry,
  RelayEntry,
} from "../types";
import { uniqueEventOptions } from "./ev3";
import { countByKey, individualEntryKey, relayEntryKey } from "./entryKeys";
import { athleteFullName } from "../utils/athleteMatch";
import { buildAthleteOverLimitDetailById } from "./athleteEventLimits";

export interface EventSummaryEntry {
  key: string;
  label: string;
  detail?: string;
  seedTime: string;
  /** Reasons this entry is flagged — a duplicate entry and/or an athlete over one of the meet's per-athlete event-count limits. Distinct from EventSummaryGroup.overLimit, which is the per-event team cap. Empty when the entry is clean. */
  warnings: string[];
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
  athleteEventLimits?: Partial<AthleteEventLimits>,
  eventEntryLimits?: Partial<EventEntryLimits>,
): EventSummaryGroup[] {
  const individualEntryLimit = eventEntryLimits?.individualEventEntryLimit ?? 0;
  const relayEntryLimit = eventEntryLimits?.relayEventEntryLimit ?? 0;
  const athleteNameById = new Map(athletes.map((a) => [a.id, athleteFullName(a)]));

  const individualDupCounts = countByKey(individualEntries, individualEntryKey);
  const relayDupCounts = countByKey(relayEntries, relayEntryKey);

  const athleteOverLimitDetailById = buildAthleteOverLimitDetailById(
    athletes,
    individualEntries,
    relayEntries,
    athleteEventLimits,
  );

  const individualGroups: EventSummaryGroup[] = uniqueEventOptions(importedEvents, false).map(
    (option) => {
      const entries: EventSummaryEntry[] = individualEntries
        .filter((e) => e.event === option.eventNumber)
        .map((e) => {
          const warnings: string[] = [];
          if ((individualDupCounts.get(individualEntryKey(e) ?? "") ?? 0) > 1) {
            warnings.push("Duplicate entry");
          }
          const overLimitDetail = athleteOverLimitDetailById.get(e.athleteId);
          if (overLimitDetail) warnings.push(overLimitDetail);
          return {
            key: e.id,
            label: athleteNameById.get(e.athleteId) || "(no athlete)",
            seedTime: e.seedTime,
            warnings,
          };
        });
      return {
        eventNumber: option.eventNumber,
        displayName: option.name,
        relay: false,
        entryLimit: individualEntryLimit,
        overLimit: individualEntryLimit > 0 && entries.length > individualEntryLimit,
        entries,
      };
    },
  );

  const relayGroups: EventSummaryGroup[] = uniqueEventOptions(importedEvents, true).map(
    (option) => {
      const entries: EventSummaryEntry[] = relayEntries
        .filter((e) => e.event === option.eventNumber)
        .map((e) => {
          const legAthleteIds = [
            e.leg1AthleteId,
            e.leg2AthleteId,
            e.leg3AthleteId,
            e.leg4AthleteId,
          ];
          const legNames = legAthleteIds.map((athleteId) =>
            athleteId ? athleteNameById.get(athleteId) || "(unknown)" : "—",
          );
          const legOverLimitDetails = legAthleteIds
            .map((athleteId) => (athleteId ? athleteOverLimitDetailById.get(athleteId) : undefined))
            .filter((detail): detail is string => detail !== undefined);
          const warnings: string[] = [];
          if ((relayDupCounts.get(relayEntryKey(e) ?? "") ?? 0) > 1) {
            warnings.push("Duplicate entry");
          }
          warnings.push(...legOverLimitDetails);
          return {
            key: e.id,
            label: `Relay ${e.relayLetter || "?"}`,
            detail: legNames.join(", "),
            seedTime: e.seedTime,
            warnings,
          };
        });
      return {
        eventNumber: option.eventNumber,
        displayName: option.name,
        relay: true,
        entryLimit: relayEntryLimit,
        overLimit: relayEntryLimit > 0 && entries.length > relayEntryLimit,
        entries,
      };
    },
  );

  return [...individualGroups, ...relayGroups].sort((a, b) => a.eventNumber - b.eventNumber);
}
