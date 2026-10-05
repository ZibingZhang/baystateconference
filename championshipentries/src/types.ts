import type { GenderAge as Gender } from "./hytek/enums";
export type { Gender };

export interface ImportedEvent {
  eventNumber: number;
  round: string;
  relay: boolean;
  gender: string;
  distance: number;
  strokeCode: string;
  scheduledTime: string;
  displayName: string;
  /** Raw EV3 field 21 (`Ev3Event.qualifyingTime`), blank if the meet has no standard for this event. See `ev3.ts`'s qualifying-standard helpers for how to interpret this. */
  qualifyingTime: string;
}

/** Per-athlete entry-count limits for a meet, enforced only as a warning (see `domain/eventSummary.ts`) rather than a hard block. */
export interface AthleteEventLimits {
  /** Max number of individual events a single athlete may be entered in at this meet. */
  maxIndividualEventsPerAthlete: number;
  /** Max number of relay events a single athlete may be entered in at this meet. */
  maxRelayEventsPerAthlete: number;
  /** Max number of events (individual + relay combined) a single athlete may be entered in at this meet. */
  maxTotalEventsPerAthlete: number;
}

/**
 * Per-event entry-count limits for a meet (how many entries a team may make
 * in a single event), enforced only as a warning (see `domain/eventSummary.ts`
 * and `domain/hy3Export.ts`) rather than a hard block. This is a meet-wide
 * policy set by the coach/host, not something the EV3 file carries — EV3 has
 * no field for it (see docs/hytek/ev3-spec.md).
 */
export interface EventEntryLimits {
  /** Max number of entries a team may make in a single individual event. */
  individualEventEntryLimit: number;
  /** Max number of entries a team may make in a single relay event. */
  relayEventEntryLimit: number;
}

export interface MeetTemplate extends AthleteEventLimits, EventEntryLimits {
  id: string;
  name: string;
  /** Raw GitHub URL of the EV3 events file this template loads events/entries from. */
  ev3Url: string;
  /** Only entries for this gender are generated when the template is viewed or copied into a meet. */
  genderFilter: Gender;
  /** Blank individual entries stubbed per individual event. Unrelated to EventEntryLimits — this is purely how many rows the template pre-fills. */
  individualEntryStubsPerEvent: number;
  /** Blank relay entries stubbed per relay event. Unrelated to EventEntryLimits — this is purely how many rows the template pre-fills. */
  relayEntryStubsPerEvent: number;
}

export interface Meet extends Partial<AthleteEventLimits>, Partial<EventEntryLimits> {
  id: string;
  name: string;
  teamCode?: string;
  importedEventsFileName?: string;
  /**
   * Raw text of the imported EV3 file. This is the sole source of truth for
   * a meet's events — both the lightweight `ImportedEvent[]` summaries the UI
   * uses (see `domain/ev3.ts`'s `parseEv3`) and the full event detail (age
   * ranges, stroke, relay-vs-individual) that Export to HY3 needs are derived
   * from it on demand rather than stored separately.
   */
  importedEventsRaw?: string;
}

export interface HighSchool {
  code: string;
  school: string;
  town: string;
  county: string;
}

export interface Athlete {
  id: string;
  meetId: string;
  lastName: string;
  firstName: string;
  gender: Gender;
  classYear: number | null;
}

export interface IndividualEntry {
  id: string;
  meetId: string;
  athleteId: string;
  /** The event's EV3 eventNumber (ImportedEvent.eventNumber), or 0 if no event is selected. */
  event: number;
  seedTime: string;
}

export interface RelayEntry {
  id: string;
  meetId: string;
  /** The event's EV3 eventNumber (ImportedEvent.eventNumber), or 0 if no event is selected. */
  event: number;
  relayLetter: string;
  leg1AthleteId: string;
  leg2AthleteId: string;
  leg3AthleteId: string;
  leg4AthleteId: string;
  seedTime: string;
}

export interface AppData {
  meets: Meet[];
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
}
