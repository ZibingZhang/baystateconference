import type { Athlete, Gender, HighSchool, IndividualEntry, Meet, RelayEntry } from './types'
import { eventDisplayName } from './ev3'
import { parseEv3 as parseEv3Full } from './hytek/ev3/parse.ts'
import type { Ev3Event, Ev3File } from './hytek/ev3/types.ts'
import { parseSwimTime } from './hytek/common.ts'
import { isDivingStroke, parseCourse, type Gender as Hy3Gender, type Stroke } from './hytek/enums.ts'
import { writeHy3 } from './hytek/hy3/write.ts'
import type { Hy3File, Hy3IndividualEntry, Hy3RelayEntry, Hy3Swimmer, Hy3Team } from './hytek/hy3/types.ts'

/** Boys/Men -> M, Girls/Women -> F. See docs/hytek/hy3-spec.md §4 for why HY3 only ever carries this two-letter alphabet in HS exports. */
function toHy3Gender(genderAge: Gender | string): Hy3Gender {
  return genderAge === 'B' || genderAge === 'M' ? 'M' : 'F'
}

export interface BuildHy3Result {
  fileName: string
  content: string
  skippedIndividualEntries: number
  skippedRelayEntries: number
}

export interface BuildHy3Error {
  error: string
}

function sanitizeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '').trim()
}

/**
 * Build a HY3 "entries" file for a meet from the app's own data model plus the
 * EV3 file that was imported for it. Requires a team code and an imported EV3
 * file — both surface as a `BuildHy3Error` rather than throwing, since they're
 * ordinary "not ready yet" states a user can fix from the UI.
 */
export function buildHy3File(
  meet: Meet,
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
  highSchool: HighSchool | undefined,
): BuildHy3Result | BuildHy3Error {
  if (!meet.teamCode) {
    return { error: 'Set a Team Code on the Team tab before exporting.' }
  }
  if (!meet.importedEventsRaw) {
    return { error: 'Import an EV3 events file on the Events tab before exporting.' }
  }

  let ev3File: Ev3File
  try {
    ev3File = parseEv3Full(meet.importedEventsRaw)
  } catch (err) {
    return {
      error: `Could not re-read the imported EV3 file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  const teamCode = meet.teamCode
  const teamName = highSchool?.school || teamCode
  const teamShortName = highSchool?.town || teamName
  const course = parseCourse(ev3File.header.courseTypeCode.charAt(0)) ?? 'Y'

  const swimmerMeetIdByAthleteId = new Map<string, number>()
  const swimmers: Hy3Swimmer[] = [...athletes]
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .map((athlete, index) => {
      const meetId = index + 1
      swimmerMeetIdByAthleteId.set(athlete.id, meetId)
      const hy3Gender = toHy3Gender(athlete.gender)
      return {
        gender: hy3Gender,
        meetId,
        lastName: athlete.lastName,
        firstName: athlete.firstName,
        classYear: athlete.classYear ? String(athlete.classYear).slice(-2) : undefined,
      }
    })

  function findEv3Event(displayName: string, relay: boolean): Ev3Event | undefined {
    return ev3File.events.find(
      (event) =>
        (event.entryType === 'R') === relay &&
        eventDisplayName(relay, event.distance, event.stroke, event.genderAge) === displayName,
    )
  }

  let skippedIndividualEntries = 0
  const hy3IndividualEntries: Hy3IndividualEntry[] = []
  for (const entry of individualEntries) {
    if (!entry.athleteId || !entry.event) continue
    const athlete = athletes.find((a) => a.id === entry.athleteId)
    const swimmerMeetId = swimmerMeetIdByAthleteId.get(entry.athleteId)
    const ev3Event = findEv3Event(entry.event, false)
    if (!athlete || swimmerMeetId === undefined || !ev3Event) {
      skippedIndividualEntries++
      continue
    }
    const stroke = (ev3Event.stroke as Stroke) || 'A'
    const hy3Gender = toHy3Gender(athlete.gender)
    hy3IndividualEntries.push({
      swimmerMeetId,
      eventNumber: ev3Event.eventNumber,
      gender: hy3Gender,
      genderAge: hy3Gender,
      distance: isDivingStroke(stroke) ? ev3Event.feeOrDiveCount : ev3Event.distance,
      stroke,
      ageMin: ev3Event.ageMin,
      ageMax: ev3Event.ageMax,
      seedTime: entry.seedTime ? parseSwimTime(entry.seedTime) : undefined,
      seedCourse: course,
      eventCourse: course,
      results: [],
    })
  }

  let skippedRelayEntries = 0
  const hy3RelayEntries: Hy3RelayEntry[] = []
  for (const entry of relayEntries) {
    if (!entry.event) continue
    const ev3Event = findEv3Event(entry.event, true)
    const legAthleteIds = [entry.leg1AthleteId, entry.leg2AthleteId, entry.leg3AthleteId, entry.leg4AthleteId]
    const legs = legAthleteIds
      .map((athleteId, index) => ({ athleteId, legNumber: index + 1 }))
      .filter((leg) => leg.athleteId)
      .map((leg) => ({ legNumber: leg.legNumber, swimmerMeetId: swimmerMeetIdByAthleteId.get(leg.athleteId) }))
    const allLegsResolved = legs.every((leg) => leg.swimmerMeetId !== undefined)
    if (!ev3Event || legs.length === 0 || !allLegsResolved) {
      skippedRelayEntries++
      continue
    }
    const hy3Gender = toHy3Gender(ev3Event.genderAge)
    hy3RelayEntries.push({
      teamCode,
      relayLetter: entry.relayLetter || 'A',
      eventNumber: ev3Event.eventNumber,
      gender: hy3Gender,
      genderAge: hy3Gender,
      distance: ev3Event.distance,
      stroke: (ev3Event.stroke as Stroke) || 'A',
      ageMin: ev3Event.ageMin,
      ageMax: ev3Event.ageMax,
      seedTime: entry.seedTime ? parseSwimTime(entry.seedTime) : undefined,
      seedCourse: course,
      eventCourse: course,
      legs: legs as { legNumber: number; swimmerMeetId: number }[],
      results: [],
    })
  }

  const team: Hy3Team = {
    code: teamCode,
    name: teamName,
    shortName: teamShortName,
    classification: 'HS',
    city: highSchool?.town,
    state: 'MA',
    country: 'USA',
    swimmers,
  }

  const hy3File: Hy3File = {
    fileInfo: {
      fileDescription: 'Meet Entries',
      softwareName: 'Hy-Tek, Ltd',
      softwareVersion: 'Win-TM 8.0Gb',
      dateCreated: new Date(),
      licensee: teamName,
    },
    meet: {
      name: ev3File.header.meetName,
      facility: ev3File.header.facility,
      startDate: ev3File.header.startDate,
      endDate: ev3File.header.endDate,
      unknownDate: ev3File.header.entriesDueDate,
      masters: false,
      meetType: '',
      course,
      courseTypeCode: ev3File.header.courseTypeCode.slice(0, 2),
    },
    teams: [team],
    individualEntries: hy3IndividualEntries,
    relayEntries: hy3RelayEntries,
  }

  const content = writeHy3(hy3File)
  const fileName = `${sanitizeFileNamePart(teamCode)}-Entries-${sanitizeFileNamePart(meet.name) || 'Meet'}.hy3`

  return { fileName, content, skippedIndividualEntries, skippedRelayEntries }
}

/** Trigger a browser download of the given HY3 file content. */
export function downloadHy3File(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
