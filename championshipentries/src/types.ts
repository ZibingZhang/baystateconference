export type Gender = 'G' | 'B' | 'W' | 'M'

export interface ImportedEvent {
  eventNumber: number
  round: string
  relay: boolean
  gender: string
  distance: number
  strokeCode: string
  scheduledTime: string
  displayName: string
  /** EV3 spec field 27 ("scoring places"), which also matches the number of entries a team may make per event. 0 for diving. See docs/hytek/ev3-spec.md §3. */
  entryLimit: number
}

export interface MeetTemplate {
  id: string
  name: string
  /** Raw GitHub URL of the EV3 events file this template loads events/entries from. */
  ev3Url: string
  /** Only entries for this gender are generated when the template is viewed or copied into a meet. */
  genderFilter: Gender
}

export interface Meet {
  id: string
  name: string
  teamCode?: string
  importedEventsFileName?: string
  importedEvents?: ImportedEvent[]
  /** Raw text of the imported EV3 file, kept so Export to HY3 can re-parse full event detail (age ranges, stroke, relay-vs-individual) that ImportedEvent doesn't carry. */
  importedEventsRaw?: string
}

export interface HighSchool {
  code: string
  school: string
  town: string
  county: string
}

export interface Athlete {
  id: string
  meetId: string
  lastName: string
  firstName: string
  gender: Gender
  classYear: number | null
}

export interface IndividualEntry {
  id: string
  meetId: string
  athleteId: string
  event: string
  seedTime: string
}

export interface RelayEntry {
  id: string
  meetId: string
  event: string
  relayLetter: string
  leg1AthleteId: string
  leg2AthleteId: string
  leg3AthleteId: string
  leg4AthleteId: string
  seedTime: string
}

export interface AppData {
  meets: Meet[]
  athletes: Athlete[]
  individualEntries: IndividualEntry[]
  relayEntries: RelayEntry[]
}
