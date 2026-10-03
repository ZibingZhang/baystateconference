import type { IndividualEntry, RelayEntry } from "../types";

/** Counts rows by a key, skipping rows whose key is undefined (e.g. not yet filled in). */
export function countByKey<T>(
  rows: T[],
  keyFn: (row: T) => string | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    if (key === undefined) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Key identifying "this athlete entered in this event" — two individual entries sharing it are a duplicate entry. */
export function individualEntryKey(
  entry: Pick<IndividualEntry, "event" | "athleteId">,
): string | undefined {
  return entry.event && entry.athleteId ? `${entry.event}|${entry.athleteId}` : undefined;
}

/** Key identifying "this relay letter entered in this event" — two relay entries sharing it are a duplicate entry. */
export function relayEntryKey(
  entry: Pick<RelayEntry, "event" | "relayLetter">,
): string | undefined {
  return entry.event && entry.relayLetter ? `${entry.event}|${entry.relayLetter}` : undefined;
}
