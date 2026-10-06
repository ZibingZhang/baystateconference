import type { RelayEntry } from "../types";

const RELAY_LEG_FIELDS = [
  "leg1AthleteId",
  "leg2AthleteId",
  "leg3AthleteId",
  "leg4AthleteId",
] as const;

function relayLegAthleteIds(entry: RelayEntry): string[] {
  return RELAY_LEG_FIELDS.map((field) => entry[field]).filter((id): id is string => Boolean(id));
}

/** Athlete ids that appear on more than one leg of the same relay entry. */
export function sameRelayDuplicateAthleteIds(entry: RelayEntry): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const athleteId of relayLegAthleteIds(entry)) {
    if (seen.has(athleteId)) duplicates.add(athleteId);
    seen.add(athleteId);
  }
  return duplicates;
}

/**
 * Maps "entryId|athleteId" to a warning for an athlete swimming more than
 * one leg of the same relay entry.
 */
export function buildRelaySelfDuplicateDetail(
  entries: RelayEntry[],
  athleteNameById: Map<string, string>,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const entry of entries) {
    for (const athleteId of sameRelayDuplicateAthleteIds(entry)) {
      const name = athleteNameById.get(athleteId) ?? "This athlete";
      result.set(`${entry.id}|${athleteId}`, `${name} swims more than one leg of this relay`);
    }
  }
  return result;
}

/**
 * Maps "entryId|athleteId" to a warning for an athlete entered in more than
 * one relay entry for the same event — independent of, and combinable
 * alongside, `buildRelaySelfDuplicateDetail`'s warning (e.g. an athlete
 * double-booked within one relay that also duplicates another relay's leg
 * for the same event triggers both).
 */
export function buildRelayCrossEventDetail(
  entries: RelayEntry[],
  athleteNameById: Map<string, string>,
  eventNameByNumber: Map<number, string>,
): Map<string, string> {
  const entryIdsByEventAthlete = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!entry.event) continue;
    for (const athleteId of new Set(relayLegAthleteIds(entry))) {
      const key = `${entry.event}|${athleteId}`;
      const entryIds = entryIdsByEventAthlete.get(key) ?? new Set<string>();
      entryIds.add(entry.id);
      entryIdsByEventAthlete.set(key, entryIds);
    }
  }

  const result = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.event) continue;
    for (const athleteId of new Set(relayLegAthleteIds(entry))) {
      const entryIds = entryIdsByEventAthlete.get(`${entry.event}|${athleteId}`);
      if (!entryIds || entryIds.size <= 1) continue;
      const name = athleteNameById.get(athleteId) ?? "This athlete";
      const eventName = eventNameByNumber.get(entry.event) ?? "this event";
      result.set(
        `${entry.id}|${athleteId}`,
        `${name} is entered in more than one relay for ${eventName}`,
      );
    }
  }
  return result;
}
