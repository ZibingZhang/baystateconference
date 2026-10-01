import type { ImportedEvent } from "../types";
import { parseEv3 as parseEv3File } from "../hytek/ev3/parse";
import type { Ev3Event } from "../hytek/ev3/types";
import { GENDER_AGE_NAMES, STROKE_NAMES, isDivingStroke } from "../hytek/enums";
import { parseSwimTime } from "../hytek/common";
import { normalizeDiveScore, normalizeSeedTime } from "../utils/seedTime";

const RELAY_STROKE_NAMES: Record<string, string> = {
  A: "Freestyle Relay",
  E: "Medley Relay",
};

export function eventDisplayName(
  relay: boolean,
  distance: number,
  strokeCode: string,
  gender: string,
): string {
  const genderName = GENDER_AGE_NAMES[gender as keyof typeof GENDER_AGE_NAMES] ?? gender;
  if (relay) {
    const strokeName = RELAY_STROKE_NAMES[strokeCode] ?? `${strokeCode} Relay`;
    return `${genderName} ${distance} ${strokeName}`;
  }
  if (isDivingStroke(strokeCode)) {
    return `${genderName} ${STROKE_NAMES[strokeCode as keyof typeof STROKE_NAMES] ?? strokeCode}`;
  }
  const strokeName = STROKE_NAMES[strokeCode as keyof typeof STROKE_NAMES] ?? strokeCode;
  return `${genderName} ${distance} ${strokeName}`;
}

function toImportedEvent(e: Ev3Event): ImportedEvent {
  const relay = e.entryType === "R";
  return {
    eventNumber: Number.parseInt(e.eventNumber, 10) || 0,
    round: e.round,
    relay,
    gender: e.genderAge,
    distance: e.distance,
    strokeCode: e.stroke,
    scheduledTime: e.startTime,
    displayName: eventDisplayName(relay, e.distance, e.stroke, e.genderAge),
    // EV3 field 27 ("scoring places") reused as the per-team entry cap; see ImportedEvent.entryLimit.
    entryLimit: Number.parseInt(e.scoringPlaces, 10) || 0,
    qualifyingTime: e.qualifyingTime,
  };
}

export function isDivingEvent(event: ImportedEvent): boolean {
  return isDivingStroke(event.strokeCode);
}

/**
 * The event's qualifying standard as a comparable number, or undefined if it
 * has none. For diving events, EV3 field 21 reuses the swim-time `M:SS.hh`
 * encoding to store a minimum score (e.g. `2:55.00` decodes to a 175.00
 * score) rather than a time — see docs/hytek/ev3-spec.md §3 field 21.
 */
export function qualifyingStandardValue(event: ImportedEvent): number | undefined {
  if (!event.qualifyingTime) return undefined;
  const parsed = parseSwimTime(event.qualifyingTime);
  return typeof parsed === "number" ? parsed : undefined;
}

/** Display string for the event's qualifying standard, or "" if it has none. */
export function formatQualifyingStandard(event: ImportedEvent): string {
  const value = qualifyingStandardValue(event);
  if (value === undefined) return "";
  return isDivingEvent(event) ? value.toFixed(2) : event.qualifyingTime;
}

/**
 * True if `seedValue` (a time in seconds, or a diving score) fails the
 * event's qualifying standard — slower than the standard for swimming
 * events, lower than the standard for diving events.
 */
export function violatesQualifyingStandard(event: ImportedEvent, seedValue: number): boolean {
  const standard = qualifyingStandardValue(event);
  if (standard === undefined) return false;
  return isDivingEvent(event) ? seedValue < standard : seedValue > standard;
}

/** Message describing why a seed time/score fails an event's qualifying standard. */
export function qualifyingViolationMessage(event: ImportedEvent): string {
  const standard = formatQualifyingStandard(event);
  return isDivingEvent(event)
    ? `Score is below the qualifying standard of ${standard} for ${event.displayName}.`
    : `Seed time is slower than the qualifying standard of ${standard} for ${event.displayName}.`;
}

/** Maps each event's display name to one representative ImportedEvent (for qualifying-standard lookups). */
export function eventByDisplayName(events: ImportedEvent[]): Map<string, ImportedEvent> {
  const map = new Map<string, ImportedEvent>();
  for (const event of events) {
    if (!map.has(event.displayName)) map.set(event.displayName, event);
  }
  return map;
}

export const INVALID_SEED_TIME_FORMAT_MESSAGE = "Invalid seed time — must be M:SS.hh or SS.hh.";
export const INVALID_DIVE_SCORE_FORMAT_MESSAGE = "Invalid dive score — must look like XXX.XX.";

export interface SeedTimeValidation {
  /** Best-effort normalized value — "" when rejected for a format error. */
  normalized: string;
  /** Set when `raw` should be rejected; describes why. */
  errorMessage?: string;
}

/**
 * Validates and normalizes a raw seed-time/score input against `event`'s EV3
 * qualifying standard, if any. Which shape the raw input is checked against —
 * `M:SS.hh`/`SS.hh` for swimming, or `SSS.hh` for diving — is picked by the
 * event's `isDivingEvent` designation. Callers decide what rejection means
 * (clearing the value, or keeping an in-progress edit from committing).
 */
export function validateSeedTime(
  raw: string,
  event: ImportedEvent | undefined,
): SeedTimeValidation {
  const diving = event !== undefined && isDivingEvent(event);
  const normalized = diving ? normalizeDiveScore(raw) : normalizeSeedTime(raw);
  if (normalized === undefined) {
    return {
      normalized: "",
      errorMessage: diving ? INVALID_DIVE_SCORE_FORMAT_MESSAGE : INVALID_SEED_TIME_FORMAT_MESSAGE,
    };
  }
  if (normalized !== "" && event) {
    const seedValue = parseSwimTime(normalized);
    if (typeof seedValue === "number" && violatesQualifyingStandard(event, seedValue)) {
      return { normalized, errorMessage: qualifyingViolationMessage(event) };
    }
  }
  return { normalized };
}

export interface Ev3ParseResult {
  meetName: string;
  events: ImportedEvent[];
}

export function parseEv3(text: string): Ev3ParseResult {
  const file = parseEv3File(text);
  return { meetName: file.header.meetName, events: file.events.map(toImportedEvent) };
}

export function uniqueEventNames(events: ImportedEvent[], relay: boolean): string[] {
  return uniqueEventOptions(events, relay).map((option) => option.name);
}

export interface EventOption {
  name: string;
  gender: string;
  entryLimit: number;
}

export function uniqueEventOptions(events: ImportedEvent[], relay: boolean): EventOption[] {
  const seen = new Set<string>();
  const options: EventOption[] = [];
  for (const event of events) {
    if (event.relay !== relay) continue;
    if (seen.has(event.displayName)) continue;
    seen.add(event.displayName);
    options.push({ name: event.displayName, gender: event.gender, entryLimit: event.entryLimit });
  }
  return options;
}
