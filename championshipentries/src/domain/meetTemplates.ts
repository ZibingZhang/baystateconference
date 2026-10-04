import type { Gender, ImportedEvent, IndividualEntry, MeetTemplate, RelayEntry } from "../types";
import { parseEv3, uniqueEventOptions } from "./ev3";

const HIGH_SCHOOL_EVENT_LIMITS = {
  maxIndividualEventsPerAthlete: 2,
  maxRelayEventsPerAthlete: 3,
  maxTotalEventsPerAthlete: 4,
};

export const MEET_TEMPLATES: MeetTemplate[] = [
  {
    id: "template-2025-fall-bay-state-conference",
    name: "2025 Fall Bay State Conference",
    ev3Url:
      "https://raw.githubusercontent.com/ZibingZhang/baystateconference/master/resources/miaa/events/2025-fall-bay-state-conference.ev3",
    genderFilter: "G",
    individualEntryStubsPerEvent: 4,
    relayEntryStubsPerEvent: 4,
    ...HIGH_SCHOOL_EVENT_LIMITS,
  },
  {
    id: "template-2025-fall-south-sectional",
    name: "2025 Fall South Sectional Championships",
    ev3Url:
      "https://raw.githubusercontent.com/ZibingZhang/baystateconference/master/resources/miaa/events/2025-fall-south-sectional.ev3",
    genderFilter: "G",
    individualEntryStubsPerEvent: 0,
    relayEntryStubsPerEvent: 1,
    ...HIGH_SCHOOL_EVENT_LIMITS,
  },
];

const RELAY_LETTERS = ["A", "B", "C", "D"];

export interface TemplateEvents {
  events: ImportedEvent[];
  rawText: string;
}

export async function fetchTemplateEvents(ev3Url: string): Promise<TemplateEvents> {
  const response = await fetch(ev3Url);
  if (!response.ok) {
    throw new Error(`Failed to load template events (${response.status})`);
  }
  const rawText = await response.text();
  const { events } = parseEv3(rawText);
  return { events, rawText };
}

export function templateFileName(ev3Url: string): string {
  return ev3Url.split("/").pop() ?? ev3Url;
}

export function buildTemplateIndividualEntries(
  meetId: string,
  events: ImportedEvent[],
  gender: Gender,
  newId: () => string,
  entriesPerEvent: number,
): IndividualEntry[] {
  return uniqueEventOptions(events, false)
    .filter((option) => option.gender === gender)
    .flatMap((option) =>
      Array.from({ length: entriesPerEvent }, () => ({
        id: newId(),
        meetId,
        athleteId: "",
        event: option.name,
        seedTime: "",
      })),
    );
}

export function buildTemplateRelayEntries(
  meetId: string,
  events: ImportedEvent[],
  gender: Gender,
  newId: () => string,
  entriesPerEvent: number,
): RelayEntry[] {
  return uniqueEventOptions(events, true)
    .filter((option) => option.gender === gender)
    .flatMap((option) =>
      Array.from({ length: entriesPerEvent }, (_, index) => ({
        id: newId(),
        meetId,
        event: option.name,
        relayLetter: RELAY_LETTERS[index % RELAY_LETTERS.length],
        leg1AthleteId: "",
        leg2AthleteId: "",
        leg3AthleteId: "",
        leg4AthleteId: "",
        seedTime: "",
      })),
    );
}
