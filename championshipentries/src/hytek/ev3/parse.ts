import { parseSlashDate } from '../common.ts'
import type { Ev3Event, Ev3File, Ev3Header } from './types.ts'

/** Split one EV3 record (with or without a trailing `*>`) into its semicolon-delimited fields. */
function splitRecord(line: string): string[] {
  const body = line.endsWith('*>') ? line.slice(0, -2) : line
  return body.split(';')
}

function field(fields: string[], index1Based: number): string {
  return fields[index1Based - 1] ?? ''
}

function parseHeaderLine(line: string): Ev3Header {
  const f = splitRecord(line)
  return {
    meetName: field(f, 1),
    facility: field(f, 2),
    startDate: parseSlashDate(field(f, 3)),
    endDate: parseSlashDate(field(f, 4)),
    entriesDueDate: parseSlashDate(field(f, 5)),
    courseTypeCode: field(f, 6),
    unknown7: field(f, 7),
    unknown8: field(f, 8),
    unknown9: field(f, 9),
    softwareSignature: field(f, 10),
    licensee: field(f, 11),
    softwareVersion: field(f, 12),
    createdDate: parseSlashDate(field(f, 13)),
    unknown14: field(f, 14),
    unknown15: field(f, 15),
    unknown16: field(f, 16),
    seasonRosterLockDate: parseSlashDate(field(f, 17)),
    unknown18: field(f, 18),
    scoringPlacesDefault: field(f, 19),
    genderConstantA: field(f, 20),
    genderConstantB: field(f, 21),
    unknown22: field(f, 22),
    unknown23: field(f, 23),
    preMeetDate: parseSlashDate(field(f, 24)),
    addressLine1: field(f, 25),
    addressLine2: field(f, 26),
    city: field(f, 27),
    state: field(f, 28),
    zip: field(f, 29),
    country: field(f, 30),
    lscRegion: field(f, 31),
    unknown32: field(f, 32),
    unknown33: field(f, 33),
    exportDate: parseSlashDate(field(f, 34)),
    internalMeetId: field(f, 35),
  }
}

function parseEventLine(line: string): Ev3Event {
  const f = splitRecord(line)
  return {
    eventNumber: field(f, 1),
    displayOrder: field(f, 2),
    round: field(f, 3),
    sessionRoundGroup: field(f, 4),
    entryType: field(f, 5),
    genderAge: field(f, 6),
    ageMin: Number(field(f, 7)) || 0,
    ageMax: Number(field(f, 8)) || 0,
    distance: Number(field(f, 9)) || 0,
    stroke: field(f, 10),
    feeOrDiveCount: Number(field(f, 11)) || 0,
    unknown12: field(f, 12),
    unknown13: field(f, 13),
    flag14: field(f, 14),
    unknown15: field(f, 15),
    unknown16to20: [16, 17, 18, 19, 20].map((i) => field(f, i)).join(';'),
    qualifyingTime: field(f, 21),
    heatCountEstimate: field(f, 22),
    pairOrder: field(f, 23),
    dayNumber: field(f, 24),
    startTime: field(f, 25),
    flag26: field(f, 26),
    scoringPlaces: field(f, 27),
    genderSlotA: field(f, 28),
    genderSlotB: field(f, 29),
    relayLegCount: Number(field(f, 30)) || 0,
  }
}

/** Parse a full EV3 file's text content (already decoded from its `latin1` bytes). */
export function parseEv3(text: string): Ev3File {
  const lines = text.split(/\r\n/).filter((l) => l.length > 0)
  if (lines.length === 0) {
    throw new Error('Empty EV3 file')
  }
  const header = parseHeaderLine(lines[0])
  const events = lines.slice(1).map(parseEventLine)
  return { header, events }
}
