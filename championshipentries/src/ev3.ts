import type { ImportedEvent } from "./types";

const STROKE_NAMES: Record<string, string> = {
  A: "Freestyle",
  B: "Backstroke",
  C: "Breaststroke",
  D: "Butterfly",
  E: "Individual Medley",
  F: "1-Meter Diving",
  G: "3-Meter Diving",
  H: "Platform Diving",
};

const RELAY_STROKE_NAMES: Record<string, string> = {
  A: "Freestyle Relay",
  E: "Medley Relay",
};

const DIVING_STROKES = new Set(["F", "G", "H"]);

// EV3 gender-age code, same alphabet as HY3 GenderAge. See docs/hytek/ev3-spec.md §3, field 6.
export const GENDER_NAMES: Record<string, string> = {
  B: "Boys",
  G: "Girls",
  M: "Mens",
  W: "Womens",
};

export function eventDisplayName(
  relay: boolean,
  distance: number,
  strokeCode: string,
  gender: string,
): string {
  const genderName = GENDER_NAMES[gender] ?? gender;
  if (relay) {
    const strokeName = RELAY_STROKE_NAMES[strokeCode] ?? `${strokeCode} Relay`;
    return `${genderName} ${distance} ${strokeName}`;
  }
  if (DIVING_STROKES.has(strokeCode)) {
    return `${genderName} ${STROKE_NAMES[strokeCode] ?? strokeCode}`;
  }
  const strokeName = STROKE_NAMES[strokeCode] ?? strokeCode;
  return `${genderName} ${distance} ${strokeName}`;
}

function splitRecord(line: string): string[] {
  const body = line.endsWith("*>") ? line.slice(0, -2) : line;
  return body.split(";");
}

export interface Ev3ParseResult {
  meetName: string;
  events: ImportedEvent[];
}

export function parseEv3(text: string): Ev3ParseResult {
  const lines = text.split(/\r\n|\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    throw new Error("The file is empty.");
  }

  const headerFields = splitRecord(lines[0]);
  const meetName = headerFields[0] ?? "";

  const events: ImportedEvent[] = lines.slice(1).map((line, index) => {
    const f = splitRecord(line);
    if (f.length < 25) {
      throw new Error(`Event line ${index + 2} does not look like a valid EV3 event record.`);
    }
    const eventNumber = Number.parseInt(f[0], 10);
    const round = f[2];
    const relay = f[4] === "R";
    const gender = f[5];
    const distance = Number.parseInt(f[8], 10) || 0;
    const strokeCode = f[9];
    const scheduledTime = f[24] ?? "";
    const entryLimit = Number.parseInt(f[26], 10) || 0;
    return {
      eventNumber,
      round,
      relay,
      gender,
      distance,
      strokeCode,
      scheduledTime,
      displayName: eventDisplayName(relay, distance, strokeCode, gender),
      entryLimit,
    };
  });

  return { meetName, events };
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
