import { appendHy3Checksum } from '../checksum.ts'
import { createRecordBuffer, formatCompactDate, formatHy3DateTime, formatSwimTime, writeField } from '../common.ts'
import { formatWithTimeCode } from '../enums.ts'
import type {
  Hy3File,
  Hy3IndividualEntry,
  Hy3RelayEntry,
  Hy3Result,
  Hy3Swimmer,
  Hy3Team,
} from './types.ts'

function n(value: number | undefined): string {
  return value === undefined ? '' : String(value)
}

function dateField(d: Date | undefined): string {
  return d ? formatCompactDate(d) : ''
}

function serializeA1(file: Hy3File): string {
  const buf = createRecordBuffer('A1')
  writeField(buf, 3, 2, '02')
  writeField(buf, 5, 25, file.fileInfo.fileDescription)
  writeField(buf, 30, 15, file.fileInfo.softwareName)
  writeField(buf, 45, 14, file.fileInfo.softwareVersion)
  writeField(buf, 59, 17, file.fileInfo.dateCreated ? formatHy3DateTime(file.fileInfo.dateCreated) : '')
  writeField(buf, 76, 53, file.fileInfo.licensee)
  return buf.join('')
}

function serializeB1(file: Hy3File): string {
  const buf = createRecordBuffer('B1')
  writeField(buf, 3, 45, file.meet.name)
  writeField(buf, 48, 45, file.meet.facility)
  writeField(buf, 93, 8, dateField(file.meet.startDate))
  writeField(buf, 101, 8, dateField(file.meet.endDate))
  writeField(buf, 109, 8, dateField(file.meet.unknownDate))
  writeField(buf, 117, 5, n(file.meet.altitudeMeters), 'right')
  return buf.join('')
}

function serializeB2(file: Hy3File): string {
  const buf = createRecordBuffer('B2')
  writeField(buf, 3, 45, file.meet.notes ?? '')
  writeField(buf, 94, 2, file.meet.masters ? '06' : '')
  writeField(buf, 97, 2, file.meet.meetType)
  writeField(buf, 99, 1, file.meet.course)
  writeField(buf, 100, 7, file.meet.unknownFeeField !== undefined ? file.meet.unknownFeeField.toFixed(2) : '', 'right')
  writeField(buf, 107, 2, file.meet.courseTypeCode)
  writeField(buf, 109, 20, file.meet.sanctionNumber ?? '')
  return buf.join('')
}

function serializeC1(team: Hy3Team): string {
  const buf = createRecordBuffer('C1')
  writeField(buf, 3, 5, team.code)
  writeField(buf, 8, 30, team.name)
  writeField(buf, 38, 16, team.shortName)
  writeField(buf, 54, 2, team.lscRegion ?? '')
  writeField(buf, 56, 30, team.contactName1 ?? '')
  writeField(buf, 86, 30, team.contactName2 ?? '')
  writeField(buf, 121, 8, team.classification ?? '')
  return buf.join('')
}

function serializeC2(team: Hy3Team): string {
  const buf = createRecordBuffer('C2')
  writeField(buf, 3, 30, team.addressLine1 ?? '')
  writeField(buf, 33, 30, team.addressLine2 ?? '')
  writeField(buf, 63, 30, team.city ?? '')
  writeField(buf, 93, 2, team.state ?? '')
  writeField(buf, 95, 10, team.zip ?? '')
  writeField(buf, 105, 3, team.country ?? '')
  writeField(buf, 109, 20, team.teamTypeTag ?? '')
  return buf.join('')
}

function serializeC3(team: Hy3Team): string {
  const buf = createRecordBuffer('C3')
  writeField(buf, 33, 20, team.daytimePhone ?? '')
  writeField(buf, 53, 20, team.eveningPhone ?? '')
  writeField(buf, 73, 20, team.fax ?? '')
  writeField(buf, 93, 36, team.email ?? '')
  return buf.join('')
}

function serializeC4(team: Hy3Team): string {
  const buf = createRecordBuffer('C4')
  writeField(buf, 3, 126, team.headCoachName ?? '')
  return buf.join('')
}

function serializeD1(swimmer: Hy3Swimmer): string {
  const buf = createRecordBuffer('D1')
  writeField(buf, 3, 1, swimmer.gender)
  writeField(buf, 4, 5, String(swimmer.meetId), 'right')
  writeField(buf, 9, 20, swimmer.lastName)
  writeField(buf, 29, 20, swimmer.firstName)
  writeField(buf, 49, 20, swimmer.nickName ?? '')
  writeField(buf, 69, 1, swimmer.middleInitial ?? '')
  writeField(buf, 70, 14, swimmer.usaSwimmingId ?? '')
  writeField(buf, 84, 5, n(swimmer.teamId), 'right')
  writeField(buf, 89, 8, dateField(swimmer.dateOfBirth))
  writeField(buf, 97, 3, n(swimmer.age), 'right')
  writeField(buf, 100, 2, swimmer.classYear ?? '')
  writeField(buf, 113, 3, swimmer.citizenship ?? '')
  writeField(buf, 125, 1, swimmer.status ?? '')
  return buf.join('')
}

/**
 * Write the event-number sub-field shared by E1 col 39-42 and F1 col 39-42.
 * Verified against real samples: the number is right-justified in a 3-char
 * sub-field (cols 39-41), with col 42 always left blank — NOT a plain
 * right-justify across all 4 columns. See hy3-spec.md §7.2.
 */
function writeEventNumber(buf: string[], eventNumber: string): void {
  writeField(buf, 39, 3, eventNumber, 'right')
}

function serializeE1(entry: Hy3IndividualEntry, swimmerLastName: string): string {
  const buf = createRecordBuffer('E1')
  writeField(buf, 3, 1, entry.gender)
  writeField(buf, 4, 5, String(entry.swimmerMeetId), 'right')
  // Cosmetic, display-only truncated last name (cols 9-13) — not consumed by
  // any reader, but real Meet Manager output always includes it.
  writeField(buf, 9, 5, swimmerLastName)
  writeField(buf, 14, 1, entry.gender)
  writeField(buf, 15, 1, entry.genderAge ?? '')
  writeField(buf, 16, 6, String(entry.distance), 'right')
  writeField(buf, 22, 1, entry.stroke)
  writeField(buf, 23, 3, String(entry.ageMin), 'right')
  writeField(buf, 26, 3, String(entry.ageMax), 'right')
  writeField(buf, 33, 6, entry.fee !== undefined ? entry.fee.toFixed(2) : '', 'right')
  writeEventNumber(buf, entry.eventNumber)
  writeField(buf, 43, 8, formatSwimTime(entry.convertedSeedTime), 'right')
  writeField(buf, 51, 1, entry.eventCourse)
  writeField(buf, 52, 8, formatSwimTime(entry.seedTime), 'right')
  writeField(buf, 60, 1, entry.seedCourse)
  // Real HS-export samples populate the alt. slot (cols 92-93), not the
  // primary one (cols 77-79) — see hy3-spec.md §7.2. Written here to match.
  writeField(buf, 92, 2, entry.meetDivision ?? '')
  writeField(buf, 84, 1, entry.exhibition ? 'X' : '')
  return buf.join('')
}

function serializeF1(entry: Hy3RelayEntry): string {
  const buf = createRecordBuffer('F1')
  writeField(buf, 3, 5, entry.teamCode)
  writeField(buf, 8, 1, entry.relayLetter)
  writeField(buf, 9, 5, entry.unknownField9to13 ?? '   0F')
  writeField(buf, 14, 1, entry.gender)
  writeField(buf, 15, 1, entry.genderAge ?? '')
  writeField(buf, 16, 6, String(entry.distance), 'right')
  writeField(buf, 22, 1, entry.stroke)
  writeField(buf, 23, 3, String(entry.ageMin), 'right')
  writeField(buf, 26, 3, String(entry.ageMax), 'right')
  writeField(buf, 33, 6, entry.fee !== undefined ? entry.fee.toFixed(2) : '', 'right')
  writeEventNumber(buf, entry.eventNumber)
  writeField(buf, 43, 8, formatSwimTime(entry.convertedSeedTime), 'right')
  writeField(buf, 51, 1, entry.eventCourse)
  writeField(buf, 52, 8, formatSwimTime(entry.seedTime), 'right')
  writeField(buf, 60, 1, entry.seedCourse)
  return buf.join('')
}

function serializeF3(entry: Hy3RelayEntry, swimmerLastNameById: Map<number, string>): string {
  const buf = createRecordBuffer('F3')
  // Col 3: an echo of the relay's gender — byte-verified constant in every
  // real sample, not otherwise read by any parser. See hy3-spec.md §8.3.
  writeField(buf, 3, 1, entry.gender)
  const sorted = [...entry.legs].sort((a, b) => a.legNumber - b.legNumber).slice(0, 8)
  sorted.forEach((leg, index) => {
    const offset = index * 13
    writeField(buf, 4 + offset, 5, String(leg.swimmerMeetId), 'right')
    // Cosmetic, display-only truncated last name (relative cols 5-9 of the
    // 13-char leg block) — not consumed by any reader, but real Meet Manager
    // output always includes it. Followed by a literal 'F' + leg number, then
    // either another literal 'F' (lookahead into the next leg's own block) or
    // a blank if this is the last leg — see hy3-spec.md §8.3.
    writeField(buf, 9 + offset, 5, swimmerLastNameById.get(leg.swimmerMeetId) ?? '')
    writeField(buf, 14 + offset, 1, 'F')
    writeField(buf, 15 + offset, 1, String(leg.legNumber))
    writeField(buf, 16 + offset, 1, index < sorted.length - 1 ? 'F' : ' ')
  })
  return buf.join('')
}

function serializeResultCommon(buf: string[], result: Hy3Result, dateStart: number): void {
  writeField(buf, 3, 1, result.round)
  writeField(buf, 4, 8, formatSwimTime(result.time), 'right')
  writeField(buf, 12, 1, result.course)
  writeField(buf, 13, 1, formatWithTimeCode(result.timeCode))
  if (result.dq) {
    writeField(buf, 14, 2, result.dq.code)
  }
  writeField(buf, 21, 3, n(result.heat), 'right')
  writeField(buf, 24, 3, n(result.lane), 'right')
  writeField(buf, 27, 3, n(result.heatPlace), 'right')
  writeField(buf, 30, 4, n(result.overallPlace), 'right')
  writeField(buf, 39, 8, result.buttonTimes?.[0] !== undefined ? result.buttonTimes[0].toFixed(2) : '', 'right')
  writeField(buf, 47, 8, result.buttonTimes?.[1] !== undefined ? result.buttonTimes[1].toFixed(2) : '', 'right')
  writeField(buf, 55, 8, result.buttonTimes?.[2] !== undefined ? result.buttonTimes[2].toFixed(2) : '', 'right')
  writeField(buf, 63, 12, result.padTime !== undefined ? result.padTime.toFixed(2) : '', 'right')
  writeField(buf, 75, 8, result.backup4Time !== undefined ? result.backup4Time.toFixed(2) : '', 'right')
  writeField(buf, dateStart, 8, dateField(result.date))
}

function serializeE2(result: Hy3Result): string {
  const buf = createRecordBuffer('E2')
  serializeResultCommon(buf, result, 88)
  writeField(buf, 83, 5, result.reactionTime !== undefined ? result.reactionTime.toFixed(2) : '', 'right')
  writeField(buf, 96, 1, result.altTimeCode ?? '')
  return buf.join('')
}

function serializeF2(result: Hy3Result): string {
  const buf = createRecordBuffer('F2')
  serializeResultCommon(buf, result, 103)
  const reactionTimes = result.reactionTimes ?? []
  for (let i = 0; i < 4; i++) {
    const rt = reactionTimes[i]
    writeField(buf, 83 + 5 * i, 5, rt !== undefined ? rt.toFixed(2) : '', 'right')
  }
  writeField(buf, 111, 1, result.altTimeCode ?? '')
  return buf.join('')
}

function serializeG1(result: Hy3Result): string | undefined {
  if (!result.splits || result.splits.length === 0) return undefined
  const buf = createRecordBuffer('G1')
  writeField(buf, 3, 1, result.round)
  let pos = 4
  for (const split of result.splits) {
    if (pos + 10 > 124) break
    writeField(buf, pos, 2, String(split.splitNumber), 'right')
    writeField(buf, pos + 2, 8, split.time.toFixed(2), 'right')
    pos += 11
  }
  return buf.join('')
}

function serializeH1(reason: string): string {
  const buf = createRecordBuffer('H1')
  writeField(buf, 5, 124, reason)
  return buf.join('')
}

function serializeH2(detail: string): string {
  const buf = createRecordBuffer('H2')
  writeField(buf, 5, 124, detail)
  return buf.join('')
}

function serializeResultAndExtras(result: Hy3Result, kind: 'individual' | 'relay'): string[] {
  const lines: string[] = []
  lines.push(kind === 'individual' ? serializeE2(result) : serializeF2(result))
  const split = serializeG1(result)
  if (split) lines.push(split)
  if (result.dq?.reason) lines.push(serializeH1(result.dq.reason))
  if (result.dq?.detail) lines.push(serializeH2(result.dq.detail))
  return lines
}

/** Serialize a Hy3File back to its on-disk text form (CRLF line endings, 128-char + checksum records). */
export function writeHy3(file: Hy3File): string {
  const bodies: string[] = []
  bodies.push(serializeA1(file))
  bodies.push(serializeB1(file))
  bodies.push(serializeB2(file))

  // Records are grouped by swimmer, not by event: each swimmer's D1 is
  // immediately followed by their own E1 entry/entries (and any results),
  // before the next swimmer's D1 — matching real Meet Manager output. See
  // docs/hytek/hy3-spec.md §3.
  for (const team of file.teams) {
    bodies.push(serializeC1(team))
    bodies.push(serializeC2(team))
    bodies.push(serializeC3(team))
    if (team.headCoachName) bodies.push(serializeC4(team))
    for (const swimmer of team.swimmers) {
      bodies.push(serializeD1(swimmer))
      for (const entry of file.individualEntries) {
        if (entry.swimmerMeetId !== swimmer.meetId) continue
        bodies.push(serializeE1(entry, swimmer.lastName))
        for (const result of entry.results) bodies.push(...serializeResultAndExtras(result, 'individual'))
      }
    }
  }

  const swimmerLastNameById = new Map<number, string>()
  for (const team of file.teams) {
    for (const swimmer of team.swimmers) swimmerLastNameById.set(swimmer.meetId, swimmer.lastName)
  }

  for (const entry of file.relayEntries) {
    bodies.push(serializeF1(entry))
    for (const result of entry.results) bodies.push(...serializeResultAndExtras(result, 'relay'))
    bodies.push(serializeF3(entry, swimmerLastNameById))
  }

  return bodies.map(appendHy3Checksum).join('\r\n') + '\r\n'
}
