import { useEffect, useState } from "react";
import type { AppData } from "./types";

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
  // No prior versions exist yet; this just strips the version tag.
  const { version: _version, ...data } = parsed;
  return { ...emptyData, ...data };
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
