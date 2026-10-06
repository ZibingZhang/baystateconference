import { parseEv3 } from "./ev3";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Maps a meet's imported EV3 event display names to their eventNumber, first occurrence wins. */
function buildEventNumberByDisplayName(importedEventsRaw: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (typeof importedEventsRaw !== "string" || !importedEventsRaw) return map;
  try {
    for (const event of parseEv3(importedEventsRaw).events) {
      if (!map.has(event.displayName)) map.set(event.displayName, event.eventNumber);
    }
  } catch {
    // Unparseable events file — legacy string events for this meet can't be resolved.
  }
  return map;
}

/**
 * Before entries were keyed by EV3 eventNumber, `event` on individual/relay
 * entries stored the EV3 display name string instead. Resolve any leftover
 * string values from that era via each meet's imported events, falling back
 * to 0 (no event selected) if the name doesn't match anything imported.
 */
export function migrateLegacyEventNames(
  entries: unknown,
  meetsById: Map<string, Record<string, unknown>>,
): unknown {
  if (!Array.isArray(entries)) return entries;
  const eventNumberByNameByMeet = new Map<string, Map<string, number>>();
  return entries.map((entry) => {
    if (!isRecord(entry) || typeof entry.event !== "string") return entry;
    const meetId = typeof entry.meetId === "string" ? entry.meetId : "";
    let eventNumberByName = eventNumberByNameByMeet.get(meetId);
    if (!eventNumberByName) {
      eventNumberByName = buildEventNumberByDisplayName(meetsById.get(meetId)?.importedEventsRaw);
      eventNumberByNameByMeet.set(meetId, eventNumberByName);
    }
    return { ...entry, event: eventNumberByName.get(entry.event) ?? 0 };
  });
}
