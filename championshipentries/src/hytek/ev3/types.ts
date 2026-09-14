/**
 * EV3 ("meet events") file model. See docs/hytek/ev3-spec.md for the full field
 * derivation. Every field the spec confirms or plausibly infers gets a typed,
 * named property; fields whose meaning is genuinely unknown are still named and
 * kept as raw strings so a parsed file round-trips losslessly through `unknownXx`
 * properties rather than silently dropping data.
 */

import type { Stroke } from "../enums.ts";

/** The meet-level header record (EV3 file line 1). */
export interface Ev3Header {
  /** Field 1. */
  meetName: string;
  /** Field 2. */
  facility: string;
  /** Field 3. */
  startDate?: Date;
  /** Field 4. */
  endDate?: Date;
  /** Field 5. Entry/roster deadline — independent of field 17, see spec. */
  entriesDueDate?: Date;
  /**
   * Field 6, raw (e.g. `YO`, `YLS`). First char is a Course letter; remainder is
   * a meet-type abbreviation. Kept raw since the abbreviation alphabet beyond
   * the leading course letter isn't fully confirmed.
   */
  courseTypeCode: string;
  /** Field 7. Unknown, observed constant `0`. */
  unknown7: string;
  /** Field 8. Unknown, observed constant `0`. */
  unknown8: string;
  /** Field 9. Unknown, observed constant `0`. */
  unknown9: string;
  /** Field 10. Software signature string, e.g. "Created by Hy-Tek's MEET MANAGER". */
  softwareSignature: string;
  /** Field 11. Hy-Tek Meet Manager licensee (the conference's MM operator, not the host school). */
  licensee: string;
  /** Field 12. Software version, e.g. "7.0Gb". */
  softwareVersion: string;
  /** Field 13. Meet/file creation date. */
  createdDate?: Date;
  /** Field 14. Unknown, observed constant `3`. */
  unknown14: string;
  /** Field 15. Unknown, always blank. */
  unknown15: string;
  /** Field 16. Unknown, observed constant `0`. */
  unknown16: string;
  /** Field 17. Season/roster-lock date (e.g. MIAA's fall Sept 1 lock date). */
  seasonRosterLockDate?: Date;
  /** Field 18. Unknown, observed constant `0`. */
  unknown18: string;
  /** Field 19. Scheduling constant, reappears as event field 27. */
  scoringPlacesDefault: string;
  /** Field 20. Scheduling constant, reappears as event field 28/29. */
  genderConstantA: string;
  /** Field 21. Scheduling constant, reappears as event field 28/29. */
  genderConstantB: string;
  /** Field 22. Unknown, varies by meet. */
  unknown22: string;
  /** Field 23. Unknown, observed constant `H`. */
  unknown23: string;
  /** Field 24. A date shortly before the meet (purpose unconfirmed). */
  preMeetDate?: Date;
  /** Field 25. Facility address line 1. */
  addressLine1: string;
  /** Field 26. Facility address line 2. */
  addressLine2: string;
  /** Field 27. Facility city. */
  city: string;
  /** Field 28. Facility state (2-letter USPS code). */
  state: string;
  /** Field 29. Facility ZIP. */
  zip: string;
  /** Field 30. Facility country. */
  country: string;
  /** Field 31. LSC/region code, e.g. "NE". Blank for non-LSC (e.g. plain dual) meets. */
  lscRegion: string;
  /** Field 32. Unknown boolean-shaped flag, observed constant `N`. */
  unknown32: string;
  /** Field 33. Unknown boolean-shaped flag, observed constant `N`. */
  unknown33: string;
  /** Field 34. File export date. */
  exportDate?: Date;
  /** Field 35. Internal Hy-Tek meet database ID. */
  internalMeetId: string;
}

/** One scheduled event (EV3 file lines 2..N). */
export interface Ev3Event {
  /** Field 1. Primary key — matches HY3 E1/F1 event number exactly. */
  eventNumber: string;
  /** Field 2. Display order; usually equals eventNumber but not guaranteed. */
  displayOrder: string;
  /** Field 3. `F` = Final/Timed-Final, `P` = Prelim. */
  round: "F" | "P" | string;
  /** Field 4. Session/round-group number; semantics unconfirmed beyond diving prelims using `3`. */
  sessionRoundGroup: string;
  /** Field 5. `R` = Relay, `I` = Individual. Authoritative — do not infer from stroke alone. */
  entryType: "R" | "I" | string;
  /** Field 6. Gender-age code (G/B/M/W). */
  genderAge: string;
  /** Field 7. Age minimum (0 = open, combined with ageMax=109). */
  ageMin: number;
  /** Field 8. Age maximum (109 = open). */
  ageMax: number;
  /** Field 9. Distance. 0 for diving events (see feeOrDiveCount). */
  distance: number;
  /** Field 10. Stroke code, shared alphabet with HY3. */
  stroke: Stroke | string;
  /**
   * Field 11. Entry fee for swimming strokes; **required dive count** for diving
   * strokes (F/G/H) — selected by `stroke`. See ev3-spec.md §3, field 11.
   */
  feeOrDiveCount: number;
  /** Field 12. Unknown, always blank. */
  unknown12: string;
  /** Field 13. Unknown, always blank. */
  unknown13: string;
  /** Field 14. Unknown flag, observed constant `N`. */
  flag14: string;
  /** Field 15. Unknown, observed constant `0`. */
  unknown15: string;
  /** Fields 16-20. Unknown, always blank in every sample. */
  unknown16to20: string;
  /** Field 21. Qualifying/time-standard, raw (blank, or `M:SS.hh`/`SS.hh`). Use parseSwimTime to interpret. */
  qualifyingTime: string;
  /** Field 22. Estimated heat count. */
  heatCountEstimate: string;
  /** Field 23. Event-pairing order (shared by a gender-paired event slot). */
  pairOrder: string;
  /** Field 24. Day number (multi-day meets; always `1` in observed single-day samples). */
  dayNumber: string;
  /** Field 25. Scheduled start time, e.g. "10:30AM". */
  startTime: string;
  /** Field 26. Unknown flag, observed constant `Y`. */
  flag26: string;
  /** Field 27. Scoring-places constant (mirrors header field 19). */
  scoringPlaces: string;
  /** Field 28. Per-gender constant, slot A (mirrors header field 20/21 depending on gender). */
  genderSlotA: string;
  /** Field 29. Per-gender constant, slot B — complement of field 28. */
  genderSlotB: string;
  /** Field 30. Relay leg count: 4 for relay events, 0 for individual events. Confirms entryType. */
  relayLegCount: number;
}

export interface Ev3File {
  header: Ev3Header;
  events: Ev3Event[];
}
