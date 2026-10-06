import { useEffect, useState } from "react";
import type { AppData } from "./types";
import { isRecord, migrateLegacyEventNames } from "./domain/legacyEventMigration";

const STORAGE_KEY = "championshipentries:data";

/**
 * Bumped whenever the persisted shape changes in a way old data needs
 * migrating for. Add a branch to `migrate` for each version jump rather than
 * mutating old data in place, so the migration history stays legible.
 */
const STORAGE_VERSION = 1;

const emptyData: AppData = {
  meets: [],
  athletes: [],
  individualEntries: [],
  relayEntries: [],
};

/** Brings a parsed localStorage blob of any past version up to the current `AppData` shape. */
function migrate(parsed: Record<string, unknown>): AppData {
  // No version jump has happened yet; this strips the version tag and
  // resolves any pre-versioning data left over from the event-name era
  // (see `domain/legacyEventMigration.ts`).
  const { version: _version, ...data } = parsed;
  const meets = Array.isArray(data.meets) ? data.meets.filter(isRecord) : [];
  const meetsById = new Map(
    meets.filter((m) => typeof m.id === "string").map((m) => [m.id as string, m]),
  );
  return {
    ...emptyData,
    ...data,
    individualEntries: migrateLegacyEventNames(data.individualEntries, meetsById),
    relayEntries: migrateLegacyEventNames(data.relayEntries, meetsById),
  } as AppData;
}

function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyData;
    return migrate(parsed as Record<string, unknown>);
  } catch {
    return emptyData;
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...data }));
  }, [data]);

  return [data, setData] as const;
}
