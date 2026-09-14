import {
  extract,
  extractRaw,
  parseCompactDate,
  parseFloatOrUndefined,
  parseHy3DateTime,
  parseIntOrUndefined,
  parseOptionalNumericTime,
  parseSwimTime,
} from "../common.ts";
import { isValidHy3Line } from "../checksum.ts";
import {
  isDqTimeCode,
  parseCourse,
  parseGender,
  parseGenderAge,
  parseResultRound,
  parseStroke,
  parseWithTimeCode,
} from "../enums.ts";
import type {
  Hy3DqInfo,
  Hy3File,
  Hy3IndividualEntry,
  Hy3RelayEntry,
  Hy3Result,
  Hy3Split,
  Hy3Swimmer,
  Hy3Team,
} from "./types.ts";

export interface ParseHy3Options {
  /** Throw if any record's checksum doesn't match its content. Defaults to false. */
  validateChecksums?: boolean;
}

type CurrentEntry =
  | { kind: "individual"; entry: Hy3IndividualEntry }
  | { kind: "relay"; entry: Hy3RelayEntry }
  | undefined;

interface ParserState {
  file: Hy3File;
  currentTeam: Hy3Team | undefined;
  currentEntry: CurrentEntry;
  /** The result record most recently populated, for H1/H2 to anchor to (mirrors hytek-parser's LAST_DQ_SLOT_KEY). */
  lastResult: Hy3Result | undefined;
}

function emptyFile(): Hy3File {
  return {
    fileInfo: { fileDescription: "", softwareName: "", softwareVersion: "", licensee: "" },
    meet: { name: "", facility: "", masters: false, meetType: "", course: "Y", courseTypeCode: "" },
    teams: [],
    individualEntries: [],
    relayEntries: [],
  };
}

function parseA1(body: string, state: ParserState): void {
  state.file.fileInfo.fileDescription = extract(body, 5, 25);
  state.file.fileInfo.softwareName = extract(body, 30, 15);
  state.file.fileInfo.softwareVersion = extract(body, 45, 14);
  state.file.fileInfo.dateCreated = parseHy3DateTime(extract(body, 59, 17));
  state.file.fileInfo.licensee = extract(body, 76, 53);
}

function parseB1(body: string, state: ParserState): void {
  state.file.meet.name = extract(body, 3, 45);
  state.file.meet.facility = extract(body, 48, 45);
  state.file.meet.startDate = parseCompactDate(extract(body, 93, 8));
  state.file.meet.endDate = parseCompactDate(extract(body, 101, 8));
  state.file.meet.unknownDate = parseCompactDate(extract(body, 109, 8));
  state.file.meet.altitudeMeters = parseIntOrUndefined(extract(body, 117, 5));
}

function parseB2(body: string, state: ParserState): void {
  state.file.meet.notes = extract(body, 3, 45) || undefined;
  state.file.meet.masters = extract(body, 94, 2) === "06";
  state.file.meet.meetType = extract(body, 97, 2);
  state.file.meet.course = parseCourse(extract(body, 99, 1)) ?? "Y";
  state.file.meet.unknownFeeField = parseFloatOrUndefined(extract(body, 100, 7));
  state.file.meet.courseTypeCode = extract(body, 107, 2);
  state.file.meet.sanctionNumber = extract(body, 109, 20) || undefined;
}

function parseC1(body: string, state: ParserState): void {
  const team: Hy3Team = {
    code: extract(body, 3, 5),
    name: extract(body, 8, 30),
    shortName: extract(body, 38, 16),
    lscRegion: extract(body, 54, 2) || undefined,
    contactName1: extract(body, 56, 30) || undefined,
    contactName2: extract(body, 86, 30) || undefined,
    classification: extract(body, 121, 8) || undefined,
    swimmers: [],
  };
  state.file.teams.push(team);
  state.currentTeam = team;
}

function parseC2(body: string, state: ParserState): void {
  const team = state.currentTeam;
  if (!team) return;
  team.addressLine1 = extract(body, 3, 30) || undefined;
  team.addressLine2 = extract(body, 33, 30) || undefined;
  team.city = extract(body, 63, 30) || undefined;
  team.state = extract(body, 93, 2) || undefined;
  team.zip = extract(body, 95, 10) || undefined;
  team.country = extract(body, 105, 3) || undefined;
  team.teamTypeTag = extract(body, 109, 20) || undefined;
}

function parseC3(body: string, state: ParserState): void {
  const team = state.currentTeam;
  if (!team) return;
  team.daytimePhone = extract(body, 33, 20) || undefined;
  team.eveningPhone = extract(body, 53, 20) || undefined;
  team.fax = extract(body, 73, 20) || undefined;
  team.email = extract(body, 93, 36) || undefined;
}

function parseC4(body: string, state: ParserState): void {
  const team = state.currentTeam;
  if (!team) return;
  team.headCoachName = extract(body, 3, 126) || undefined;
}

function parseD1(body: string, state: ParserState): void {
  const team = state.currentTeam;
  if (!team) return;
  const swimmer: Hy3Swimmer = {
    gender: parseGender(extract(body, 3, 1)) ?? "F",
    meetId: Number(extract(body, 4, 5)) || 0,
    lastName: extract(body, 9, 20),
    firstName: extract(body, 29, 20),
    nickName: extract(body, 49, 20) || undefined,
    middleInitial: extract(body, 69, 1) || undefined,
    usaSwimmingId: extract(body, 70, 14) || undefined,
    teamId: parseIntOrUndefined(extract(body, 84, 5)),
    dateOfBirth: parseCompactDate(extract(body, 89, 8)),
    age: parseIntOrUndefined(extract(body, 97, 3)),
    classYear: extract(body, 100, 2) || undefined,
    citizenship: extract(body, 113, 3) || undefined,
    status: extract(body, 125, 1) || undefined,
  };
  team.swimmers.push(swimmer);
}

function findSwimmerMeetId(state: ParserState, meetId: number): boolean {
  return state.file.teams.some((t) => t.swimmers.some((s) => s.meetId === meetId));
}

function sameIndividualEntry(a: Hy3IndividualEntry, b: Hy3IndividualEntry): boolean {
  return (
    a.swimmerMeetId === b.swimmerMeetId &&
    a.eventNumber === b.eventNumber &&
    a.seedTime === b.seedTime &&
    a.seedCourse === b.seedCourse &&
    a.convertedSeedTime === b.convertedSeedTime
  );
}

function parseE1(body: string, state: ParserState): void {
  const swimmerMeetId = Number(extract(body, 4, 5)) || 0;
  const genderAgeRaw = extract(body, 15, 1);
  const entry: Hy3IndividualEntry = {
    swimmerMeetId,
    gender: parseGender(extract(body, 14, 1)) ?? "F",
    genderAge: parseGenderAge(genderAgeRaw) ?? (genderAgeRaw || undefined),
    distance: Number(extract(body, 16, 6)) || 0,
    stroke: parseStroke(extract(body, 22, 1)) ?? "A",
    ageMin: Number(extract(body, 23, 3)) || 0,
    ageMax: Number(extract(body, 26, 3)) || 0,
    fee: parseFloatOrUndefined(extract(body, 33, 6)),
    eventNumber: extract(body, 39, 4),
    convertedSeedTime: parseSwimTime(extract(body, 43, 8)),
    eventCourse: parseCourse(extract(body, 51, 1)) ?? "Y",
    seedTime: parseSwimTime(extract(body, 52, 8)),
    seedCourse: parseCourse(extract(body, 60, 1)) ?? "Y",
    meetDivision: extract(body, 77, 3) || extract(body, 92, 2) || undefined,
    exhibition: extract(body, 84, 1) === "X",
    results: [],
  };

  const existing = state.file.individualEntries.find((e) => sameIndividualEntry(e, entry));
  if (existing) {
    state.currentEntry = { kind: "individual", entry: existing };
    return;
  }
  state.file.individualEntries.push(entry);
  state.currentEntry = { kind: "individual", entry };
}

function parseResultCommon(
  body: string,
  dateStart: number,
): Omit<
  Hy3Result,
  "padTime" | "buttonTimes" | "backup4Time" | "reactionTime" | "reactionTimes" | "altTimeCode"
> {
  const round = parseResultRound(extract(body, 3, 1)) ?? "F";
  const timeCode = parseWithTimeCode(extract(body, 13, 1));
  let dq: Hy3DqInfo | undefined;
  if (isDqTimeCode(timeCode)) {
    dq = { code: extract(body, 14, 2) };
  }
  return {
    round,
    time: parseSwimTime(extract(body, 4, 8)),
    course: parseCourse(extract(body, 12, 1)) ?? "Y",
    timeCode,
    dq,
    heat: parseIntOrUndefined(extract(body, 21, 3)),
    lane: parseIntOrUndefined(extract(body, 24, 3)),
    heatPlace: parseIntOrUndefined(extract(body, 27, 3)),
    overallPlace: parseIntOrUndefined(extract(body, 30, 4)),
    date: parseCompactDate(extract(body, dateStart, 8)),
  };
}

function parseE2(body: string, state: ParserState): void {
  if (state.currentEntry?.kind !== "individual") return;
  const result: Hy3Result = {
    ...parseResultCommon(body, 88),
    buttonTimes: [
      parseOptionalNumericTime(extract(body, 39, 8)),
      parseOptionalNumericTime(extract(body, 47, 8)),
      parseOptionalNumericTime(extract(body, 55, 8)),
    ],
    padTime: parseOptionalNumericTime(extract(body, 63, 12)),
    backup4Time: parseOptionalNumericTime(extract(body, 75, 8)),
    reactionTime: parseOptionalNumericTime(extract(body, 83, 5), { allowNegative: true }),
    altTimeCode: extract(body, 96, 1) || undefined,
  };
  state.currentEntry.entry.results.push(result);
  state.lastResult = result.dq ? result : undefined;
}

function parseF1(body: string, state: ParserState): void {
  const teamCode = extract(body, 3, 5);
  const relayLetter = extract(body, 8, 1);
  const genderAgeRaw = extract(body, 15, 1);
  const entry: Hy3RelayEntry = {
    teamCode,
    relayLetter,
    gender: parseGender(extract(body, 14, 1)) ?? "F",
    genderAge: parseGenderAge(genderAgeRaw) ?? (genderAgeRaw || undefined),
    distance: Number(extract(body, 16, 6)) || 0,
    stroke: parseStroke(extract(body, 22, 1)) ?? "A",
    ageMin: Number(extract(body, 23, 3)) || 0,
    ageMax: Number(extract(body, 26, 3)) || 0,
    fee: parseFloatOrUndefined(extract(body, 33, 6)),
    eventNumber: extract(body, 39, 4),
    convertedSeedTime: parseSwimTime(extract(body, 43, 8)),
    eventCourse: parseCourse(extract(body, 51, 1)) ?? "Y",
    seedTime: parseSwimTime(extract(body, 52, 8)),
    seedCourse: parseCourse(extract(body, 60, 1)) ?? "Y",
    legs: [],
    results: [],
    unknownField9to13: extractRaw(body, 9, 5),
  };

  const existing = state.file.relayEntries.find(
    (e) =>
      e.teamCode === entry.teamCode &&
      e.relayLetter === entry.relayLetter &&
      e.eventNumber === entry.eventNumber &&
      e.seedTime === entry.seedTime &&
      e.seedCourse === entry.seedCourse,
  );
  if (existing) {
    state.currentEntry = { kind: "relay", entry: existing };
    return;
  }
  state.file.relayEntries.push(entry);
  state.currentEntry = { kind: "relay", entry };
}

function parseF2(body: string, state: ParserState): void {
  if (state.currentEntry?.kind !== "relay") return;
  const reactionTimes = [0, 1, 2, 3].map((i) =>
    parseOptionalNumericTime(extract(body, 83 + 5 * i, 5), { allowNegative: true }),
  );
  const result: Hy3Result = {
    ...parseResultCommon(body, 103),
    buttonTimes: [
      parseOptionalNumericTime(extract(body, 39, 8)),
      parseOptionalNumericTime(extract(body, 47, 8)),
      parseOptionalNumericTime(extract(body, 55, 8)),
    ],
    padTime: parseOptionalNumericTime(extract(body, 63, 12)),
    backup4Time: parseOptionalNumericTime(extract(body, 75, 8)),
    reactionTimes,
    altTimeCode: extract(body, 111, 1) || undefined,
  };
  state.currentEntry.entry.results.push(result);
  state.lastResult = result.dq ? result : undefined;
}

function parseF3(body: string, state: ParserState): void {
  if (state.currentEntry?.kind !== "relay") return;
  const legs: Hy3RelayEntry["legs"] = [];
  for (let x = 0; x < 8; x++) {
    const offset = x * 13;
    const meetIdRaw = extract(body, 4 + offset, 5);
    if (meetIdRaw === "") break;
    const meetId = Number(meetIdRaw);
    if (!Number.isFinite(meetId)) break;
    if (!findSwimmerMeetId(state, meetId)) continue;
    const legNumber = parseIntOrUndefined(extract(body, 15 + offset, 1));
    if (legNumber === undefined) continue;
    legs.push({ legNumber, swimmerMeetId: meetId });
  }
  state.currentEntry.entry.legs = legs;
}

function parseG1(body: string, state: ParserState): void {
  if (!state.currentEntry) return;
  const round = parseResultRound(extract(body, 3, 1)) ?? "F";
  const results = state.currentEntry.entry.results.filter((r) => r.round === round);
  const target = results[results.length - 1];
  if (!target) return;
  const splits: Hy3Split[] = target.splits ? [...target.splits] : [];
  let pos = 4;
  // Stop once the 2-char split-number sub-field is blank. (Not a raw
  // single-character peek: a right-justified single-digit split number like
  // " 1" has a leading space that isn't itself the end-of-data marker.)
  while (pos + 10 <= 124 && extract(body, pos, 2) !== "") {
    const splitNumber = parseIntOrUndefined(extract(body, pos, 2));
    const time = parseFloatOrUndefined(extract(body, pos + 2, 8));
    if (splitNumber === undefined || time === undefined) break;
    splits.push({ splitNumber, time });
    pos += 11;
  }
  target.splits = splits;
}

function parseH1(body: string, state: ParserState): void {
  const info = state.lastResult?.dq;
  if (!info) return;
  info.reason = extract(body, 5, 124) || undefined;
}

function parseH2(body: string, state: ParserState): void {
  const info = state.lastResult?.dq;
  if (!info) return;
  info.detail = extract(body, 5, 124) || undefined;
}

type LineHandler = (body: string, state: ParserState) => void;

const HANDLERS: Record<string, LineHandler> = {
  A1: parseA1,
  B1: parseB1,
  B2: parseB2,
  C1: parseC1,
  C2: parseC2,
  C3: parseC3,
  C4: parseC4,
  D1: parseD1,
  E1: parseE1,
  E2: parseE2,
  F1: parseF1,
  F2: parseF2,
  F3: parseF3,
  G1: parseG1,
  H1: parseH1,
  H2: parseH2,
};

/** Parse a full HY3 file's text content (already decoded from its `latin1` bytes). */
export function parseHy3(text: string, options: ParseHy3Options = {}): Hy3File {
  const lines = text.split(/\r\n/).filter((l) => l.length > 0);
  if (lines.length === 0 || lines[0].slice(0, 2) !== "A1") {
    throw new Error("Not a HY3 file: expected first record to be A1");
  }

  if (options.validateChecksums) {
    for (const line of lines) {
      if (line.slice(0, 2) === "Z0") break;
      if (!isValidHy3Line(line)) {
        throw new Error(`Invalid checksum on line: ${line.slice(0, 20)}...`);
      }
    }
  }

  const state: ParserState = {
    file: emptyFile(),
    currentTeam: undefined,
    currentEntry: undefined,
    lastResult: undefined,
  };

  for (const line of lines) {
    const code = line.slice(0, 2);
    if (code === "Z0") break;
    const body = line.slice(0, 128);
    const handler = HANDLERS[code];
    if (!handler) continue; // unknown record type — preserved nowhere, matching reference parser's tolerant skip
    handler(body, state);
  }

  return state.file;
}
