import type { Athlete, IndividualEntry, Meet, RelayEntry } from "../types";

const BACKUP_VERSION = 1;

export interface MeetBackup {
  version: number;
  exportedAt: string;
  meet: Meet;
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
}

export interface MeetBackupError {
  error: string;
}

function sanitizeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

/** Bundles one meet plus all of its athletes and entries into a self-contained, re-importable backup. */
export function buildMeetBackup(
  meet: Meet,
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
): MeetBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    meet,
    athletes,
    individualEntries,
    relayEntries,
  };
}

export function meetBackupFileName(meetName: string): string {
  return `${sanitizeFileNamePart(meetName) || "Meet"}.meet.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

/** Parses and structurally validates a `.meet.json` backup file's text. */
export function parseMeetBackup(raw: string): MeetBackup | MeetBackupError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "This file is not valid JSON." };
  }
  if (!isRecord(parsed)) {
    return { error: "This file is not a meet backup." };
  }
  const { meet, athletes, individualEntries, relayEntries } = parsed;
  if (!isRecord(meet) || typeof meet.id !== "string" || typeof meet.name !== "string") {
    return { error: "This file is not a meet backup — it's missing the meet itself." };
  }
  if (
    !Array.isArray(athletes) ||
    !Array.isArray(individualEntries) ||
    !Array.isArray(relayEntries)
  ) {
    return { error: "This file is not a meet backup — it's missing athletes or entries." };
  }
  if (!athletes.every(isValidAthlete)) {
    return { error: "This file is not a meet backup — it has a malformed athlete record." };
  }
  if (!individualEntries.every(isValidIndividualEntry)) {
    return {
      error: "This file is not a meet backup — it has a malformed individual entry record.",
    };
  }
  if (!relayEntries.every(isValidRelayEntry)) {
    return { error: "This file is not a meet backup — it has a malformed relay entry record." };
  }
  return {
    version: typeof parsed.version === "number" ? parsed.version : BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    meet: meet as unknown as Meet,
    athletes,
    individualEntries,
    relayEntries,
  };
}
