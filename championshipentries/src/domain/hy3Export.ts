import type { Athlete, HighSchool, IndividualEntry, Meet, RelayEntry } from "../types";
import { eventDisplayName, parseEv3EventNumber } from "./ev3";
import { countByKey, individualEntryKey, relayEntryKey } from "./entryKeys";
import { parseEv3 as parseEv3Full } from "../hytek/ev3/parse.ts";
import type { Ev3Event, Ev3File } from "../hytek/ev3/types.ts";
import { parseSwimTime } from "../hytek/common.ts";
import {
  genderAgeToGender as toHy3Gender,
  isDivingStroke,
  parseCourse,
  type Stroke,
} from "../hytek/enums.ts";
import { writeHy3 } from "../hytek/hy3/write.ts";
import type {
  Hy3File,
  Hy3IndividualEntry,
  Hy3RelayEntry,
  Hy3Swimmer,
  Hy3Team,
} from "../hytek/hy3/types.ts";

export interface BuildHy3Result {
  fileName: string;
  content: string;
  skippedIndividualEntries: number;
  skippedRelayEntries: number;
}

export interface BuildHy3Error {
  error: string;
}

function sanitizeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

/** Team code and an imported EV3 file are the two prerequisites a real (downloadable) export needs. */
function missingExportPrerequisite(meet: Meet): string | undefined {
  if (!meet.teamCode) return "Set a Team Code on the Team tab before exporting.";
  if (!meet.importedEventsRaw)
    return "Import an EV3 events file on the Events tab before exporting.";
  return undefined;
}

function findEv3Event(ev3File: Ev3File, eventNumber: number, relay: boolean): Ev3Event | undefined {
  return ev3File.events.find(
    (event) => (event.entryType === "R") === relay && parseEv3EventNumber(event) === eventNumber,
  );
}

/** Maps each EV3 event number to a human-readable display name, for review/skip messages. */
function eventNumberToName(ev3File: Ev3File): Map<number, string> {
  const map = new Map<number, string>();
  for (const event of ev3File.events) {
    const num = parseEv3EventNumber(event);
    if (!map.has(num)) {
      map.set(
        num,
        eventDisplayName(event.entryType === "R", event.distance, event.stroke, event.genderAge),
      );
    }
  }
  return map;
}

/** Why `entry` would be skipped on export, or undefined if it will be included. */
function individualEntrySkipReason(
  entry: IndividualEntry,
  athletes: Athlete[],
  ev3File: Ev3File,
): string | undefined {
  if (!entry.athleteId) return "No athlete selected.";
  if (!entry.event) return "No event selected.";
  if (!athletes.some((a) => a.id === entry.athleteId)) return "Athlete not found.";
  if (!findEv3Event(ev3File, entry.event, false)) return "Event not found in imported EV3 file.";
  return undefined;
}

/** Why `entry` would be skipped on export, or undefined if it will be included. */
function relayEntrySkipReason(
  entry: RelayEntry,
  athletes: Athlete[],
  ev3File: Ev3File,
): string | undefined {
  if (!entry.event) return "No event selected.";
  if (!findEv3Event(ev3File, entry.event, true)) return "Event not found in imported EV3 file.";
  const legAthleteIds = [
    entry.leg1AthleteId,
    entry.leg2AthleteId,
    entry.leg3AthleteId,
    entry.leg4AthleteId,
  ].filter(Boolean);
  if (legAthleteIds.length === 0) return "No athletes assigned to any leg.";
  if (!legAthleteIds.every((id) => athletes.some((a) => a.id === id))) {
    return "One or more legs reference a missing athlete.";
  }
  return undefined;
}

/**
 * Build a HY3 "entries" file for a meet from the app's own data model plus the
 * EV3 file that was imported for it. Requires an imported EV3 file, surfaced
 * as a `BuildHy3Error` rather than thrown, since it's an ordinary "not ready
 * yet" state a user can fix from the UI. The team code is not required here —
 * callers that need a real, submittable export (as opposed to a preview)
 * enforce that separately (see `missingExportPrerequisite`) — so a missing
 * team code just leaves the team fields blank.
 */
export function buildHy3File(
  meet: Meet,
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
  highSchool: HighSchool | undefined,
): BuildHy3Result | BuildHy3Error {
  if (!meet.importedEventsRaw) {
    return { error: "Import an EV3 events file on the Events tab before exporting." };
  }

  let ev3File: Ev3File;
  try {
    ev3File = parseEv3Full(meet.importedEventsRaw);
  } catch (err) {
    return {
      error: `Could not re-read the imported EV3 file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const teamCode = meet.teamCode ?? "";
  const teamName = highSchool?.school || teamCode;
  const course = parseCourse(ev3File.header.courseTypeCode.charAt(0)) ?? "Y";

  const swimmerMeetIdByAthleteId = new Map<string, number>();
  const swimmers: Hy3Swimmer[] = [...athletes]
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .map((athlete, index) => {
      const meetId = index + 1;
      swimmerMeetIdByAthleteId.set(athlete.id, meetId);
      const hy3Gender = toHy3Gender(athlete.gender);
      return {
        gender: hy3Gender,
        meetId,
        lastName: athlete.lastName,
        firstName: athlete.firstName,
        classYear: athlete.classYear ? String(athlete.classYear).slice(-2) : undefined,
      };
    });

  let skippedIndividualEntries = 0;
  const hy3IndividualEntries: Hy3IndividualEntry[] = [];
  for (const entry of individualEntries) {
    if (individualEntrySkipReason(entry, athletes, ev3File)) {
      skippedIndividualEntries++;
      continue;
    }
    const athlete = athletes.find((a) => a.id === entry.athleteId);
    const swimmerMeetId = swimmerMeetIdByAthleteId.get(entry.athleteId);
    const ev3Event = findEv3Event(ev3File, entry.event, false);
    if (!athlete || swimmerMeetId === undefined || !ev3Event) {
      skippedIndividualEntries++;
      continue;
    }
    const stroke = (ev3Event.stroke as Stroke) || "A";
    const hy3Gender = toHy3Gender(athlete.gender);
    hy3IndividualEntries.push({
      swimmerMeetId,
      eventNumber: ev3Event.eventNumber,
      gender: hy3Gender,
      genderAge: hy3Gender,
      distance: isDivingStroke(stroke) ? ev3Event.feeOrDiveCount : ev3Event.distance,
      stroke,
      ageMin: ev3Event.ageMin,
      ageMax: ev3Event.ageMax,
      seedTime: entry.seedTime ? parseSwimTime(entry.seedTime) : undefined,
      seedCourse: course,
      eventCourse: course,
      results: [],
    });
  }

  let skippedRelayEntries = 0;
  const hy3RelayEntries: Hy3RelayEntry[] = [];
  for (const entry of relayEntries) {
    if (relayEntrySkipReason(entry, athletes, ev3File)) {
      skippedRelayEntries++;
      continue;
    }
    const ev3Event = findEv3Event(ev3File, entry.event, true);
    const legAthleteIds = [
      entry.leg1AthleteId,
      entry.leg2AthleteId,
      entry.leg3AthleteId,
      entry.leg4AthleteId,
    ];
    const legs = legAthleteIds
      .map((athleteId, index) => ({ athleteId, legNumber: index + 1 }))
      .filter((leg) => leg.athleteId)
      .map((leg) => ({
        legNumber: leg.legNumber,
        swimmerMeetId: swimmerMeetIdByAthleteId.get(leg.athleteId),
      }));
    const allLegsResolved = legs.every((leg) => leg.swimmerMeetId !== undefined);
    if (!ev3Event || legs.length === 0 || !allLegsResolved) {
      skippedRelayEntries++;
      continue;
    }
    const hy3Gender = toHy3Gender(ev3Event.genderAge);
    hy3RelayEntries.push({
      teamCode,
      relayLetter: entry.relayLetter || "A",
      eventNumber: ev3Event.eventNumber,
      gender: hy3Gender,
      genderAge: hy3Gender,
      distance: ev3Event.distance,
      stroke: (ev3Event.stroke as Stroke) || "A",
      ageMin: ev3Event.ageMin,
      ageMax: ev3Event.ageMax,
      seedTime: entry.seedTime ? parseSwimTime(entry.seedTime) : undefined,
      seedCourse: course,
      eventCourse: course,
      legs: legs as { legNumber: number; swimmerMeetId: number }[],
      results: [],
    });
  }

  const team: Hy3Team = {
    code: teamCode,
    name: teamName,
    // Real Meet Manager output mirrors the team code here, not the town —
    // see hy3-spec.md §6.1.
    shortName: teamCode,
    classification: "HS",
    state: "MA",
    country: "USA",
    swimmers,
  };

  const hy3File: Hy3File = {
    fileInfo: {
      fileDescription: "Meet Entries",
      softwareName: "Hy-Tek, Ltd",
      softwareVersion: "Win-TM 8.0Gb",
      dateCreated: new Date(),
      licensee: teamName,
    },
    meet: {
      name: ev3File.header.meetName,
      facility: ev3File.header.facility,
      startDate: ev3File.header.startDate,
      endDate: ev3File.header.endDate,
      unknownDate: ev3File.header.entriesDueDate,
      masters: false,
      meetType: "",
      course,
      courseTypeCode: ev3File.header.courseTypeCode.slice(0, 2),
    },
    teams: [team],
    individualEntries: hy3IndividualEntries,
    relayEntries: hy3RelayEntries,
  };

  const content = writeHy3(hy3File);
  const fileName = `${sanitizeFileNamePart(teamCode)}-Entries-${sanitizeFileNamePart(meet.name) || "Meet"}.hy3`;

  return { fileName, content, skippedIndividualEntries, skippedRelayEntries };
}

export interface ExportReviewLimitIssue {
  event: string;
  count: number;
  limit: number;
}

export interface ExportReviewDuplicateIndividual {
  event: string;
  athleteName: string;
  count: number;
}

export interface ExportReviewDuplicateRelay {
  event: string;
  relayLetter: string;
  count: number;
}

export interface ExportReviewSkippedEvent {
  kind: "individual" | "relay";
  event: string;
  count: number;
}

export interface ExportReview {
  overLimitEvents: ExportReviewLimitIssue[];
  duplicateIndividualEntries: ExportReviewDuplicateIndividual[];
  duplicateRelayEntries: ExportReviewDuplicateRelay[];
  skippedEvents: ExportReviewSkippedEvent[];
}

/**
 * Previews what `buildHy3File` would do, without building or downloading
 * anything — surfaces the same skip reasons, plus over-the-cap events and
 * duplicate entries, so the user can fix them before export rather than
 * discovering them in the downloaded file (or later, in Hy-Tek).
 */
export function buildExportReview(
  meet: Meet,
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
): ExportReview | BuildHy3Error {
  const prerequisiteError = missingExportPrerequisite(meet);
  if (prerequisiteError) {
    return { error: prerequisiteError };
  }

  let ev3File: Ev3File;
  try {
    ev3File = parseEv3Full(meet.importedEventsRaw as string);
  } catch (err) {
    return {
      error: `Could not re-read the imported EV3 file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const athleteNameById = new Map(
    athletes.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
  );
  const eventNameByNumber = eventNumberToName(ev3File);
  const eventName = (eventNumber: number) =>
    eventNameByNumber.get(eventNumber) ?? "(unknown event)";

  const overLimitEvents: ExportReviewLimitIssue[] = [];
  const entryCountsByEvent: [Map<number, number>, number][] = [
    [
      countByKey(individualEntries, (e) => e.event || undefined),
      meet.individualEventEntryLimit ?? 0,
    ],
    [countByKey(relayEntries, (e) => e.event || undefined), meet.relayEventEntryLimit ?? 0],
  ];
  for (const [countByEvent, limit] of entryCountsByEvent) {
    for (const [event, count] of countByEvent) {
      if (limit > 0 && count > limit)
        overLimitEvents.push({ event: eventName(event), count, limit });
    }
  }

  const individualDupCounts = countByKey(individualEntries, individualEntryKey);
  const seenIndividualDupKeys = new Set<string>();
  const duplicateIndividualEntries: ExportReviewDuplicateIndividual[] = [];
  for (const entry of individualEntries) {
    const key = individualEntryKey(entry);
    if (!key || seenIndividualDupKeys.has(key)) continue;
    const count = individualDupCounts.get(key) ?? 0;
    if (count > 1) {
      seenIndividualDupKeys.add(key);
      duplicateIndividualEntries.push({
        event: eventName(entry.event),
        athleteName: athleteNameById.get(entry.athleteId) ?? "Unknown athlete",
        count,
      });
    }
  }

  const relayDupCounts = countByKey(relayEntries, relayEntryKey);
  const seenRelayDupKeys = new Set<string>();
  const duplicateRelayEntries: ExportReviewDuplicateRelay[] = [];
  for (const entry of relayEntries) {
    const key = relayEntryKey(entry);
    if (!key || seenRelayDupKeys.has(key)) continue;
    const count = relayDupCounts.get(key) ?? 0;
    if (count > 1) {
      seenRelayDupKeys.add(key);
      duplicateRelayEntries.push({
        event: eventName(entry.event),
        relayLetter: entry.relayLetter,
        count,
      });
    }
  }

  const skippedCountByKey = new Map<string, ExportReviewSkippedEvent>();
  const recordSkip = (kind: "individual" | "relay", event: string) => {
    const key = `${kind}|${event}`;
    const existing = skippedCountByKey.get(key);
    if (existing) existing.count++;
    else skippedCountByKey.set(key, { kind, event, count: 1 });
  };
  for (const entry of individualEntries) {
    if (individualEntrySkipReason(entry, athletes, ev3File)) {
      recordSkip("individual", entry.event ? eventName(entry.event) : "(no event)");
    }
  }
  for (const entry of relayEntries) {
    if (relayEntrySkipReason(entry, athletes, ev3File)) {
      recordSkip("relay", entry.event ? eventName(entry.event) : "(no event)");
    }
  }
  const skippedEvents = [...skippedCountByKey.values()];

  return { overLimitEvents, duplicateIndividualEntries, duplicateRelayEntries, skippedEvents };
}

/** Trigger a browser download of the given HY3 file content. */
export function downloadHy3File(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
