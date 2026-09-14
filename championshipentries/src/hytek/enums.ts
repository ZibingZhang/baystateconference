/**
 * Shared value encodings used by both EV3 and HY3 files.
 * See docs/hytek/ev3-spec.md §4 and docs/hytek/hy3-spec.md §4 for the source spec.
 */

/** Swimmer gender. */
export type Gender = "M" | "F";

/** Normalize a raw gender byte (case-insensitive) to Gender, or undefined if unrecognized. */
export function parseGender(raw: string): Gender | undefined {
  const v = raw.trim().toUpperCase();
  return v === "M" || v === "F" ? v : undefined;
}

/**
 * Age-weighted gender name used in HY3 E1/F1 col 15.
 * NOTE: in HS-conference exports this column is unreliable — it's frequently just
 * a repeat of the plain Gender letter instead of this alphabet. See hy3-spec.md §4.
 */
export type GenderAge = "M" | "B" | "W" | "G";

export function parseGenderAge(raw: string): GenderAge | undefined {
  const v = raw.trim().toUpperCase();
  return v === "M" || v === "B" || v === "W" || v === "G" ? v : undefined;
}

export const GENDER_AGE_NAMES: Record<GenderAge, string> = {
  B: "Boys",
  G: "Girls",
  M: "Mens",
  W: "Womens",
};

/** Boys/Men -> M, Girls/Women -> F — the two-letter alphabet HY3 carries in HS exports. */
export function genderAgeToGender(genderAge: GenderAge | string): Gender {
  return genderAge === "B" || genderAge === "M" ? "M" : "F";
}

/** Swimming stroke, or diving board, encoded as a single letter. */
export type Stroke = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export const STROKE_NAMES: Record<Stroke, string> = {
  A: "Freestyle",
  B: "Backstroke",
  C: "Breaststroke",
  D: "Butterfly",
  E: "Individual Medley",
  F: "1-Meter Diving",
  G: "3-Meter Diving",
  H: "Platform Diving",
};

export function isDivingStroke(stroke: string): boolean {
  return stroke === "F" || stroke === "G" || stroke === "H";
}

export function parseStroke(raw: string): Stroke | undefined {
  const v = raw.trim().toUpperCase();
  return v in STROKE_NAMES ? (v as Stroke) : undefined;
}

/** Course the event/time was swum in. */
export type Course = "Y" | "S" | "M" | "L" | "X";

export const COURSE_NAMES: Record<Course, string> = {
  Y: "SCY",
  S: "SCM",
  M: "SCM",
  L: "LCM",
  X: "DQ / no course",
};

export function parseCourse(raw: string): Course | undefined {
  const v = raw.trim().toUpperCase();
  return v === "Y" || v === "S" || v === "M" || v === "L" || v === "X" ? v : undefined;
}

/** HY3 B2 2-digit meet-type code. Blank/unrecognized is common in HS exports. */
export type MeetTypeCode =
  | "00"
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "0A"
  | "0B"
  | "0C";

export const MEET_TYPE_NAMES: Record<MeetTypeCode, string> = {
  "00": "Time Trials",
  "01": "Invitational",
  "02": "Regional",
  "03": "LSC Championship",
  "04": "Zone",
  "05": "Zone Championship",
  "06": "National Championship",
  "07": "Juniors",
  "08": "Seniors",
  "09": "Dual",
  "0A": "International",
  "0B": "Open",
  "0C": "League",
};

/** Which round a result record (E2/F2/G1) belongs to. */
export type ResultRound = "P" | "F" | "S";

export function parseResultRound(raw: string): ResultRound | undefined {
  const v = raw.trim().toUpperCase();
  return v === "P" || v === "F" || v === "S" ? v : undefined;
}

/** Time-code byte accompanying a recorded time in E2/F2 col 13. */
export type WithTimeCode =
  | "NORMAL"
  | "NO_SHOW"
  | "SCRATCH"
  | "DQ"
  | "FALSE_START"
  | "DNF"
  | "UNKNOWN";

const WITH_TIME_CODE_MAP: Record<string, WithTimeCode> = {
  "": "NORMAL",
  " ": "NORMAL",
  R: "NO_SHOW",
  S: "SCRATCH",
  Q: "DQ",
  F: "FALSE_START",
  D: "DNF",
};

const WITH_TIME_CODE_TO_RAW: Record<WithTimeCode, string> = {
  NORMAL: " ",
  NO_SHOW: "R",
  SCRATCH: "S",
  DQ: "Q",
  FALSE_START: "F",
  DNF: "D",
  UNKNOWN: "U",
};

export function parseWithTimeCode(raw: string): WithTimeCode {
  return WITH_TIME_CODE_MAP[raw] ?? (raw.trim() === "" ? "NORMAL" : "UNKNOWN");
}

export function formatWithTimeCode(code: WithTimeCode): string {
  return WITH_TIME_CODE_TO_RAW[code];
}

export function isDqTimeCode(code: WithTimeCode): boolean {
  return code === "DQ" || code === "FALSE_START" || code === "DNF";
}

/** A time field's value can be a swum time in seconds, or one of these replacement codes. */
export type ReplacedTimeCode = "NT" | "NS" | "DNF" | "DQ" | "SCR";

const REPLACED_TIME_CODES: ReplacedTimeCode[] = ["NT", "NS", "DNF", "DQ", "SCR"];

export function isReplacedTimeCode(v: unknown): v is ReplacedTimeCode {
  return typeof v === "string" && (REPLACED_TIME_CODES as string[]).includes(v);
}

/** A time is either a number of seconds, or a replacement code (no time recorded / DQ / etc). */
export type SwimTime = number | ReplacedTimeCode;
