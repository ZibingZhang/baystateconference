import type { ImportedEvent } from "../types";
import { parseEv3 as parseEv3File } from "../hytek/ev3/parse";
import type { Ev3Event } from "../hytek/ev3/types";
import { GENDER_AGE_NAMES, STROKE_NAMES, isDivingStroke } from "../hytek/enums";

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
  };
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
