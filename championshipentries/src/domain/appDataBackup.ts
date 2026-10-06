import type { AppData, Athlete, IndividualEntry, Meet, RelayEntry } from "../types";
import { migrateLegacyEventNames } from "./legacyEventMigration";

const BACKUP_VERSION = 1;

export interface AppDataBackup {
  version: number;
  exportedAt: string;
  meets: Meet[];
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
}

export interface AppDataBackupError {
  error: string;
}

/** Bundles every meet, athlete, and entry in the app into a single re-importable backup. */
export function buildAppDataBackup(data: AppData): AppDataBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    meets: data.meets,
    athletes: data.athletes,
    individualEntries: data.individualEntries,
    relayEntries: data.relayEntries,
  };
}

export function appDataBackupFileName(): string {
  return `ChampionshipEntries-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidMeet(value: unknown): value is Meet {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isValidAthlete(value: unknown): value is Athlete {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.meetId === "string" &&
    typeof value.lastName === "string" &&
    typeof value.firstName === "string" &&
    typeof value.gender === "string" &&
    (typeof value.classYear === "number" || value.classYear === null)
  );
}

function isValidIndividualEntry(value: unknown): value is IndividualEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.meetId === "string" &&
    typeof value.athleteId === "string" &&
    typeof value.event === "number" &&
    typeof value.seedTime === "string"
  );
}

function isValidRelayEntry(value: unknown): value is RelayEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.meetId === "string" &&
    typeof value.event === "number" &&
    typeof value.relayLetter === "string" &&
    typeof value.leg1AthleteId === "string" &&
    typeof value.leg2AthleteId === "string" &&
    typeof value.leg3AthleteId === "string" &&
    typeof value.leg4AthleteId === "string" &&
    typeof value.seedTime === "string"
  );
}

/** Parses and structurally validates a full-data backup file's text. */
export function parseAppDataBackup(raw: string): AppDataBackup | AppDataBackupError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "This file is not valid JSON." };
  }
  if (!isRecord(parsed)) {
    return { error: "This file is not a data backup." };
  }
  const { meets, athletes, individualEntries, relayEntries } = parsed;
  if (
    !Array.isArray(meets) ||
    !Array.isArray(athletes) ||
    !Array.isArray(individualEntries) ||
    !Array.isArray(relayEntries)
  ) {
    return { error: "This file is not a data backup — it's missing meets, athletes, or entries." };
  }
  if (!meets.every(isValidMeet)) {
    return { error: "This file is not a data backup — it has a malformed meet record." };
  }
  if (!athletes.every(isValidAthlete)) {
    return { error: "This file is not a data backup — it has a malformed athlete record." };
  }
  const meetsById = new Map(meets.map((m) => [m.id, m as unknown as Record<string, unknown>]));
  const migratedIndividualEntries = migrateLegacyEventNames(
    individualEntries,
    meetsById,
  ) as unknown[];
  const migratedRelayEntries = migrateLegacyEventNames(relayEntries, meetsById) as unknown[];
  if (!migratedIndividualEntries.every(isValidIndividualEntry)) {
    return {
      error: "This file is not a data backup — it has a malformed individual entry record.",
    };
  }
  if (!migratedRelayEntries.every(isValidRelayEntry)) {
    return { error: "This file is not a data backup — it has a malformed relay entry record." };
  }
  return {
    version: typeof parsed.version === "number" ? parsed.version : BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    meets,
    athletes,
    individualEntries: migratedIndividualEntries,
    relayEntries: migratedRelayEntries,
  };
}
