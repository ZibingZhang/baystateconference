import { formatSlashDate } from "../common.ts";
import type { Ev3Event, Ev3File, Ev3Header } from "./types.ts";

function dateField(d: Date | undefined): string {
  return d ? formatSlashDate(d) : "";
}

function serializeHeader(h: Ev3Header): string {
  const fields = [
    h.meetName,
    h.facility,
    dateField(h.startDate),
    dateField(h.endDate),
    dateField(h.entriesDueDate),
    h.courseTypeCode,
    h.unknown7,
    h.unknown8,
    h.unknown9,
    h.softwareSignature,
    h.licensee,
    h.softwareVersion,
    dateField(h.createdDate),
    h.unknown14,
    h.unknown15,
    h.unknown16,
    dateField(h.seasonRosterLockDate),
    h.unknown18,
    h.scoringPlacesDefault,
    h.genderConstantA,
    h.genderConstantB,
    h.unknown22,
    h.unknown23,
    dateField(h.preMeetDate),
    h.addressLine1,
    h.addressLine2,
    h.city,
    h.state,
    h.zip,
    h.country,
    h.lscRegion,
    h.unknown32,
    h.unknown33,
    dateField(h.exportDate),
    h.internalMeetId,
  ];
  return fields.join(";");
}

function serializeEvent(e: Ev3Event): string {
  const unknown16to20 = e.unknown16to20.split(";");
  const fields = [
    e.eventNumber,
    e.displayOrder,
    e.round,
    e.sessionRoundGroup,
    e.entryType,
    e.genderAge,
    String(e.ageMin),
    String(e.ageMax),
    String(e.distance),
    e.stroke,
    String(e.feeOrDiveCount),
    e.unknown12,
    e.unknown13,
    e.flag14,
    e.unknown15,
    ...unknown16to20,
    e.qualifyingTime,
    e.heatCountEstimate,
    e.pairOrder,
    e.dayNumber,
    e.startTime,
    e.flag26,
    e.scoringPlaces,
    e.genderSlotA,
    e.genderSlotB,
    String(e.relayLegCount),
  ];
  return fields.join(";");
}

/** Serialize an Ev3File back to its on-disk text form (CRLF line endings, `*>` terminators). */
export function writeEv3(file: Ev3File): string {
  const lines = [serializeHeader(file.header), ...file.events.map(serializeEvent)];
  return lines.map((l) => l + "*>").join("\r\n") + "\r\n";
}
