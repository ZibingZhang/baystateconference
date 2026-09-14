/**
 * HY3 (merge entries/results) file model. See docs/hytek/hy3-spec.md for the
 * full field derivation, confidence markers, and byte-level column tables this
 * mirrors record type by record type.
 */

import type {
  Course,
  Gender,
  GenderAge,
  ResultRound,
  Stroke,
  SwimTime,
  WithTimeCode,
} from "../enums.ts";

export interface Hy3FileInfo {
  /** A1 cols 5-29. E.g. "Meet Entries". */
  fileDescription: string;
  /** A1 cols 30-44. E.g. "Hy-Tek, Ltd". */
  softwareName: string;
  /** A1 cols 45-54. E.g. "Win-TM 8.0Gb". */
  softwareVersion: string;
  /** A1 cols 59-75. */
  dateCreated?: Date;
  /** A1 cols 76-128. The entity whose MM license generated this file. */
  licensee: string;
}

export interface Hy3MeetInfo {
  /** B1 cols 3-47. */
  name: string;
  /** B1 cols 48-92. */
  facility: string;
  /** B1 cols 93-100. */
  startDate?: Date;
  /** B1 cols 101-108. */
  endDate?: Date;
  /** B1 cols 109-116. Unconfirmed purpose; often the entries-deadline date. */
  unknownDate?: Date;
  /** B1 cols 117-121, meters. */
  altitudeMeters?: number;
  /** B2 cols 3-47. */
  notes?: string;
  /** B2 cols 94-95 == "06". */
  masters: boolean;
  /** B2 cols 97-98, 2-digit code. Blank/unrecognized in most HS exports. */
  meetType: string;
  /** B2 col 99. */
  course: Course;
  /** B2 cols 100-106. Unconfirmed numeric field, observed constant "0.00". */
  unknownFeeField?: number;
  /** B2 cols 107-108. Course+meet-type tag copied verbatim from the source EV3 header field 6 (truncated to 2 chars). */
  courseTypeCode: string;
  /** B2 cols 109-128. */
  sanctionNumber?: string;
}

export interface Hy3Team {
  /** C1 cols 3-7. */
  code: string;
  /** C1 cols 8-37. */
  name: string;
  /** C1 cols 38-53. */
  shortName: string;
  /** C1 cols 54-55. LSC/region code, e.g. "NE". */
  lscRegion?: string;
  /** C1 cols 56-85. */
  contactName1?: string;
  /** C1 cols 86-115. */
  contactName2?: string;
  /** C1 cols 116-128. Unconfirmed; observed "HS" for high-school teams. */
  classification?: string;

  /** C2 cols 3-32. Free-text "c/o"/attention line. */
  addressLine1?: string;
  /** C2 cols 33-62. */
  addressLine2?: string;
  /** C2 cols 63-92. */
  city?: string;
  /** C2 cols 93-94. */
  state?: string;
  /** C2 cols 95-104. */
  zip?: string;
  /** C2 cols 105-107. */
  country?: string;
  /** C2 cols 108-128. Unconfirmed; observed "OTH". */
  teamTypeTag?: string;

  /** C3 cols 33-52. */
  daytimePhone?: string;
  /** C3 cols 53-72. */
  eveningPhone?: string;
  /** C3 cols 73-92. */
  fax?: string;
  /** C3 cols 93-128. */
  email?: string;

  /** C4 cols 3-128. Best-guess: head coach name. Record type not in the public reference parser. */
  headCoachName?: string;

  swimmers: Hy3Swimmer[];
}

export interface Hy3Swimmer {
  /** D1 col 3. */
  gender: Gender;
  /** D1 cols 4-8. Primary key within the file — links to E1/F3. */
  meetId: number;
  /** D1 cols 9-28. */
  lastName: string;
  /** D1 cols 29-48. */
  firstName: string;
  /** D1 cols 49-68. */
  nickName?: string;
  /** D1 col 69. */
  middleInitial?: string;
  /** D1 cols 70-83. */
  usaSwimmingId?: string;
  /** D1 cols 84-88. */
  teamId?: number;
  /** D1 cols 89-96. */
  dateOfBirth?: Date;
  /**
   * D1 cols 97-99, per the reference library. In real HS exports this is
   * frequently 0 (no DOB tracked); see `classYear` below for what actually
   * fills the adjacent columns in those files.
   */
  age?: number;
  /**
   * D1 cols 100-101, per the reference library ("Fr"/"So"/"Jr"/"Sr" or other
   * data). Observed anomaly in our HS samples: this instead holds the last two
   * digits of a graduating class year, often overflowing to 3 digits (e.g.
   * "029" = Class of 2029) — kept as a raw string rather than interpreted.
   */
  classYear?: string;
  /** D1 cols 113-115. */
  citizenship?: string;
  /** D1 col 125. Only "N" (Normal) or blank observed. */
  status?: string;
}

export interface Hy3DqInfo {
  /** E2/F2 cols 14-15 (2-char DisqualificationCode, e.g. "2L"). */
  code: string;
  /** H1: free-text DQ reason. */
  reason?: string;
  /** H2: free-text infraction detail. */
  detail?: string;
}

export interface Hy3Split {
  splitNumber: number;
  time: number;
}

export interface Hy3Result {
  round: ResultRound;
  time?: SwimTime;
  course: Course;
  timeCode: WithTimeCode;
  dq?: Hy3DqInfo;
  heat?: number;
  lane?: number;
  heatPlace?: number;
  overallPlace?: number;
  date?: Date;
  splits?: Hy3Split[];
  /** Touchpad/backup timing detail. Individual (E2): single reaction time. Relay (F2): one per leg (up to 4). */
  padTime?: number;
  buttonTimes?: (number | undefined)[];
  backup4Time?: number;
  reactionTime?: number;
  reactionTimes?: (number | undefined)[];
  /** Observed values 'A'/'K'/blank; semantics unconfirmed. */
  altTimeCode?: string;
}

export interface Hy3IndividualEntry {
  /** D1 meetId this entry belongs to. */
  swimmerMeetId: number;
  /** E1 cols 39-42. Join key shared with the source EV3 event number. */
  eventNumber: string;
  gender: Gender;
  /** E1 col 15. Unreliable in HS exports — see Hy3Swimmer.classYear-style caveat. */
  genderAge?: GenderAge | string;
  /** Dive count for diving strokes, distance otherwise. */
  distance: number;
  stroke: Stroke;
  ageMin: number;
  ageMax: number;
  fee?: number;
  seedTime?: SwimTime;
  seedCourse: Course;
  convertedSeedTime?: SwimTime;
  eventCourse: Course;
  meetDivision?: string;
  exhibition?: boolean;
  results: Hy3Result[];
}

export interface Hy3RelayLeg {
  legNumber: number;
  swimmerMeetId: number;
}

export interface Hy3RelayEntry {
  teamCode: string;
  /** F1 col 8: "A", "B", "C"... distinguishing a school's Nth relay team in this event. */
  relayLetter: string;
  eventNumber: string;
  gender: Gender;
  genderAge?: GenderAge | string;
  distance: number;
  stroke: Stroke;
  ageMin: number;
  ageMax: number;
  fee?: number;
  seedTime?: SwimTime;
  seedCourse: Course;
  convertedSeedTime?: SwimTime;
  eventCourse: Course;
  legs: Hy3RelayLeg[];
  results: Hy3Result[];
  /**
   * F1 cols 9-13. Genuinely unknown filler, observed as the literal constant
   * `   0F` in every real sample. Preserved verbatim when parsed; defaults to
   * that same observed constant when building a new entry from scratch.
   */
  unknownField9to13?: string;
}

export interface Hy3File {
  fileInfo: Hy3FileInfo;
  meet: Hy3MeetInfo;
  teams: Hy3Team[];
  individualEntries: Hy3IndividualEntry[];
  relayEntries: Hy3RelayEntry[];
}
