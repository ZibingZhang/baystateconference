# EV3 File Format Specification

Reverse-engineered from real Hy-Tek Meet Manager exports and cross-checked against the [SwimComm/hytek-parser](https://github.com/SwimComm/hytek-parser) HY3 field definitions, since EV3 and HY3 share the same underlying Hy-Tek data model (gender/stroke/course codes, event numbering).

**There is no public Hy-Tek specification for EV3.** Every field below was derived by diffing three real files byte-for-byte. Fields are marked:
- ✅ **Confirmed** — value pattern leaves no reasonable ambiguity, usually because it matches a known HY3 enum or is cross-validated against the paired HY3 output file.
- ⚠️ **Inferred** — a plausible, evidence-backed guess. Good enough to round-trip, but semantics could be subtly wrong.
- ❓ **Unknown** — value observed and stable, meaning not determined. A parser should preserve it opaquely (round-trip it verbatim) rather than interpret it.

## 1. Container format

- **Encoding**: ASCII / Windows-1252 (no multi-byte characters observed; treat as `latin1` to be safe against stray high bytes, same as HY3).
- **Line ending**: CRLF (`\r\n`), confirmed via `file` and hex dump.
- **Record separator**: none needed — one record per line.
- **Field separator**: semicolon (`;`). Fields are **not** fixed-width and **not** quoted — a literal `;` inside a text field would break parsing (not observed in samples, but no escaping mechanism exists either, so treat as a real risk with e.g. meet names).
- **Record terminator**: every line ends with the literal 2-byte sequence `*>` immediately before the CRLF. This is a plain terminator, **not a checksum** — unlike HY3, EV3 records carry no checksum at all (no fixed width to protect via checksum).
- **No record-type prefix.** Every line is positional: line 1 is always the meet-header record; every subsequent line is an event record. There is nothing analogous to HY3's `A1`/`B1`/`E1` two-letter codes.
- **File-level structure**:
  ```
  <meet header line>*>\r\n
  <event line 1>*>\r\n
  <event line 2>*>\r\n
  ...
  <event line N>*>\r\n
  ```
  No file footer/terminator record exists (confirmed: files end immediately after the last event line, no trailing blank sentinel record).

### Parsing algorithm (JS)

```js
function parseEv3(buffer) {
  const text = buffer.toString('latin1');
  const lines = text.split('\r\n').filter(l => l.length > 0);
  const header = parseHeaderLine(lines[0]);
  const events = lines.slice(1).map(parseEventLine);
  return { header, events };
}

function splitRecord(line) {
  const body = line.endsWith('*>') ? line.slice(0, -2) : line;
  return body.split(';');
}
```

### Writing algorithm (JS)

```js
function writeEv3({ header, events }) {
  const lines = [serializeHeader(header), ...events.map(serializeEvent)];
  return lines.map(l => l + '*>').join('\r\n') + '\r\n';
}
```
No checksum computation needed — this is the one meaningful simplification versus HY3.

## 2. Meet header record (line 1)

Semicolon-delimited, 35 fields. Sample (Bay State dual meet):

```
2025 Fall Bay State Conference;Wheaton College;10/24/2025;10/26/2025;09/01/2025;YO;0;0;0;Created by Hy-Tek's MEET MANAGER;Melrose YMCA;7.0Gb;10/11/2025;3;;0;09/01/2025;0;4;2;3;6;H;10/20/2025;26 E. Main St.;;Norton;MA;02766;USA;;N;N;10/19/2025;41862*>
```

| # | Sample value | Field | Status | Notes |
|---|---|---|---|---|
| 1 | `2025 Fall Bay State Conference` | Meet name | ✅ | Free text. Matches HY3 `B1` meet name. |
| 2 | `Wheaton College` | Facility name | ✅ | Matches HY3 `B1` facility. |
| 3 | `10/24/2025` | Meet start date | ✅ | `MM/DD/YYYY`. Matches HY3 `B1` start date (re-encoded there as `MMDDYYYY`). |
| 4 | `10/26/2025` | Meet end date | ✅ | `MM/DD/YYYY`. For a single-day meet, equals field 3. |
| 5 | `09/01/2025` | Entry/roster deadline | ⚠️ | `MM/DD/YYYY`. In the Bay State and MIAA-Winter samples this equals field 17 exactly; in MIAA-Fall it differs (`10/29/2025` vs. field 17's `09/01/2025`), so it is a genuinely independent "entries due" date, not a duplicate of field 17. |
| 6 | `YO` / `YLS` | Course + meet-type code | ⚠️ | First character is the **Course** letter, using the exact same alphabet as HY3's `Course` enum: `Y`=SCY, `L`=LCM, `S`/`M`=SCM. The remaining 1–2 characters are a meet-type abbreviation (`O` for a dual/conference meet, `LS` for an MIAA sectional). This same code reappears — truncated to 2 chars — inside the generated HY3 file's `B2` record (see [HY3 spec §5.2](hy3-spec.md#52-b2-—-secondary-meet-info)), which is strong confirmation this is a real, meaningful field and not padding. |
| 7 | `0` | ❓ | Unknown | Constant `0` in all 3 samples. |
| 8 | `0` | ❓ | Unknown | Constant `0` in all 3 samples. |
| 9 | `0` | ❓ | Unknown | Constant `0` in all 3 samples. |
| 10 | `Created by Hy-Tek's MEET MANAGER` | Software signature | ✅ | Literal constant string identifying the authoring software, analogous to HY3 `A1`'s software name/version. |
| 11 | `Melrose YMCA` | Licensee | ✅ | Identical across all 3 sample files despite 3 different meets/hosts — this is the **registered Hy-Tek Meet Manager license holder** (i.e., whoever in the conference operates the MM software that generates the events files), not the host school. Same concept as HY3 `A1`'s `licensee` field. |
| 12 | `7.0Gb` / `7.0Ca` | Software version | ✅ | Matches the version suffix style seen in HY3 `A1` (`Win-TM 8.0Gb`). |
| 13 | `10/11/2025` | File/meet creation date | ⚠️ | `MM/DD/YYYY`, precedes the meet start date. Most likely "date this meet was created in Meet Manager" (distinct from field 34, the file *export* date). |
| 14 | `3` | ❓ | Unknown | Constant `3` in all 3 samples. |
| 15 | *(empty)* | ❓ | Unknown | Always blank. |
| 16 | `0` | ❓ | Unknown | Constant `0` in all 3 samples. |
| 17 | `09/01/2025` / `12/01/2025` | Season/roster-lock date | ⚠️ | `MM/DD/YYYY`. Looks like a season-wide roster certification date (e.g., MIAA's Sept 1 fall-roster-lock date) rather than a meet-specific one — see field 5 discussion. |
| 18 | `0` | ❓ | Unknown | Constant `0` in all 3 samples. |
| 19 | `4` | ❓ Scheduling constant | ⚠️ | Constant `4` in all 3 samples; reappears verbatim as field 27 on every event line (see §3). Likely a default "number of scoring places" or similar meet-wide config value that gets stamped onto each event. |
| 20 | `2` | ❓ Scheduling constant | ⚠️ | Reappears as event-line field 28 (boys) / field 29 (girls) — see §3. |
| 21 | `3` | ❓ Scheduling constant | ⚠️ | Reappears as event-line field 29 (boys) / field 28 (girls) — see §3. |
| 22 | `6` / `1` | ❓ | Unknown | Varies by meet; no confirmed correlation found (does *not* reliably match the diving dive-count seen in field 11 of event lines). |
| 23 | `H` | ❓ | Unknown | Constant `H` in all 3 samples. |
| 24 | `10/20/2025` | A date shortly before the meet | ⚠️ | `MM/DD/YYYY`. Possibly a seeding/psych-sheet-release deadline. |
| 25 | `26 E. Main St.` | Facility address line 1 | ✅ | Matches the pattern of HY3 `C2` address fields (same concept, different record). |
| 26 | *(empty)* | Facility address line 2 | ✅ | Always blank in samples; parallel structure to line 1. |
| 27 | `Norton` | Facility city | ✅ | |
| 28 | `MA` | Facility state | ✅ | 2-letter USPS code. |
| 29 | `02766` | Facility ZIP | ✅ | |
| 30 | `USA` | Facility country | ✅ | |
| 31 | *(empty)* / `NE` / `NC` | LSC / region code | ⚠️ | Blank for the dual meet, `NE`/`NC` (New England / ... ) for the two MIAA sectionals. Matches the concept of HY3 `C1`'s LSC/region field. |
| 32 | `N` | ❓ | Unknown | Constant `N` in all 3 samples — plausibly a boolean flag (e.g., "masters meet"). |
| 33 | `N` | ❓ | Unknown | Constant `N` in all 3 samples — plausibly another boolean flag (e.g., "seed by combined time"). |
| 34 | `10/19/2025` | File export date | ⚠️ | `MM/DD/YYYY`, always 1 day before field 24 in these samples. Most likely "the date this specific EV3 file was generated/exported," distinct from field 13's meet-creation date. |
| 35 | `41862` | Internal meet ID | ⚠️ | Bare integer, varies per meet (`41862`, `41822`, `61912`). Not a valid date serial in any useful range; most likely an internal Hy-Tek meet database ID. No confirmed link to any HY3 field. |

## 3. Event record (lines 2..N)

One line per scheduled event. Sample (girls 200 medley relay, from the Bay State dual meet):

```
1;1;F;1;R;G;0;109;200;E;0;;;N;0;;;;;;;3;1;1;10:30AM;Y;4;3;2;4*>
```

30 semicolon-delimited fields:

| # | Sample value | Field | Status | Notes |
|---|---|---|---|---|
| 1 | `1` | Event sequence | ✅ | Sequential integer. **Confirmed to equal the HY3 `E1`/`F1` `event_number` field 1:1** — the same event in the paired HY3 entries file (see [HY3 §7.1](hy3-spec.md#71-e1--individual-event-entry)) carries this exact number. This is the primary key that links an EV3 event definition to its HY3 entries. |
| 2 | `1` | Event display order | ⚠️ | Always observed equal to field 1 in every sample row across all 3 files. Kept as a separate field because Meet Manager allows re-sequencing display order independently of the assigned event number; treat as "usually == field 1, do not assume so." |
| 3 | `F` / `P` | Round | ✅ | Single character. Uses the same alphabet as HY3's `ResultType`: `F`=Final/Timed-Final, `P`=Prelim. Diving events in a prelim/final format emit **two** EV3 lines for the same event pairing — one `P` line and one `F` line (see MIAA Winter sample, events 5 & the diving final that follows) — mirroring how HY3 emits separate `E2`/`F2` blocks per round. |
| 4 | `1` / `3` | Session/round-group number | ❓ | `1` for ordinary timed-final events; `3` observed specifically on `P`-round diving lines. Not confirmed as a general "session number" — may instead be specific to diving's separate prelim procedure. |
| 5 | `R` / `I` | Relay vs. Individual | ✅ | `R`=Relay, `I`=Individual. This is authoritative — do **not** infer relay-ness from stroke code `E` alone, since `E` (medley) is shared by both the 200 Medley Relay and the 400 IM. |
| 6 | `G` / `B` / `M` / `W` | Gender-age code | ✅ | Matches HY3's `GenderAge` enum exactly: `G`=Girls, `B`=Boys, `W`=Women, `M`=Men. |
| 7 | `0` | Age minimum | ✅ | Integer. `0` combined with field 8 = `109` means "no age restriction" (Hy-Tek's universal "open" sentinel, same as HY3 — see `get_age_group` in the reference parser). |
| 8 | `109` | Age maximum | ✅ | Integer. `109` = open/no maximum (sentinel value), matching HY3 exactly. |
| 9 | `200` / `0` | Distance (yards/meters per course) | ✅ | Integer. `0` for diving events — the "distance" concept doesn't apply; dive count lives in field 11 instead. |
| 10 | `E` | Stroke code | ✅ | Single char, identical alphabet to HY3's `Stroke` enum: `A`=Free, `B`=Back, `C`=Breast, `D`=Fly, `E`=IM/Medley, `F`=1m diving, `G`=3m diving, `H`=platform diving. |
| 11 | `0` / `6` / `11` | Entry fee **or** dive count | ⚠️ | `0` for every regular swimming event in all 3 samples (fees not used in these HS conference/sectional meets). For diving events (stroke `F`/`G`/`H`), this field instead holds the **required dive count** (`6`, `11` observed). **Confirmed cross-format**: HY3 folds this same value into its `E1` `distance` column for diving events (a 6-dive 1m event shows up as HY3 event distance `6.0`, stroke `DIVING_1M` — see [HY3 §7.1](hy3-spec.md#71-e1--individual-event-entry)). A generic parser should treat this field as "fee for swimming strokes, dive-count for diving strokes," selected by field 10. |
| 12 | *(empty)* | ❓ | Unknown | Always blank in every sample line. |
| 13 | *(empty)* | ❓ | Unknown | Always blank in every sample line. |
| 14 | `N` | ❓ | Unknown | Constant `N` on every event line in every sample. Plausibly a boolean event-level flag (e.g., "exhibition-only" or "combine with next event"), but never seen as `Y`. |
| 15 | `0` | ❓ | Unknown | Constant `0` on every event line in every sample. |
| 16–20 | *(all empty)* | ❓ | Unknown | Five consecutive blank fields on every sample line — reserved/unused in these exports. |
| 21 | *(empty)* / `2:15.55` | Qualifying / time-standard | ✅ | Blank in the Bay State **dual meet** file; populated with a `M:SS.hh` or `SS.hh` time string in **both** MIAA sectional files (e.g. `2:15.55`, `1:52.99`). This is the automatic qualifying/entry time standard swimmers must meet to be entered in that event — present only when the meet enforces one. Format matches HY3 time fields (see [HY3 §7.1 seed_time](hy3-spec.md#71-e1--individual-event-entry)). |
| 22 | `3` / `2` / `1` | Heat count (est.) | ⚠️ | Small positive integer, varies per event/gender within the same file. Likely the number of heats Meet Manager pre-allocated for seeding this event. |
| 23 | `1` | Event pairing order | ⚠️ | Increments once per **gender-paired event slot** — i.e., a girls event and its corresponding boys event share the same value, and diving events get their own independent sequence. This is the "flight order" used to interleave girls/boys events on the heat sheet, distinct from the raw event number in field 1. |
| 24 | `1` | Day number | ⚠️ | Constant `1` in every sample (all sample meets are single-day). Presumed to be a day-of-meet index for multi-day meets, unverified since no multi-day sample was available. |
| 25 | `10:30AM` | Scheduled start time | ✅ | `H:MMAM/PM`, no leading zero on the hour. Wall-clock time this event/session block is scheduled to begin. |
| 26 | `Y` | ❓ | Unknown | Constant `Y` on every event line in every sample. Plausibly "timed final" or "scored" flag. |
| 27 | `4` | Scoring-places constant | ⚠️ | Constant `4` on every non-diving event line in every sample; `0` on diving lines. Matches header field 19 exactly (same value, meet-wide). |
| 28 | `3` / `2` | Per-gender constant, slot A | ⚠️ | `3` on Girls (`G`) event lines, `2` on Boys (`B`) event lines; `0` on diving lines. Matches header fields 20/21 (in reversed order depending on gender). |
| 29 | `2` / `3` | Per-gender constant, slot B | ⚠️ | The complement of field 28 — `2` on Girls lines, `3` on Boys lines; `0` on diving lines. |
| 30 | `4` / `0` | Relay leg count | ✅ | `4` on every relay event line (field 5 = `R`), `0` on every individual event line (field 5 = `I`). Confirms field 5 and is directly useful: number of swimmers required per relay leg group. |

### Cross-file consistency actually observed

- Fields 27–29 are **entirely determined** by (a) whether the event is diving, and (b) the event's gender code (field 6) — they are not independent per-event data, just a per-meet template stamped onto every line. A parser does not need to trust their values; it can safely recompute them from fields 6 and 10 if round-tripping through a system that regenerates EV3, but **should preserve them verbatim when merely relaying the file**, since their true source-of-truth semantics aren't fully confirmed.
- Diving events (`F`/`G`/`H` stroke) consistently zero out fields 22–30's "scoring/lane" template (`27,28,29,30` all `0`), and repurpose field 11 for dive count instead of fee.

## 4. Known limitation vs. real-world Meet Manager

Only 3 sample files (1 dual meet, 2 MIAA sectionals, all high-school swimming, all single-day, all SCY) were available to reverse this spec. Fields marked ❓ **Unknown** should be:
1. Parsed and stored opaquely (not discarded) so a round-trip write reproduces the original file byte-for-byte for those columns.
2. Never relied upon for business logic in the entries pipeline.

If a wider corpus becomes available (multi-day meets, LCM/SCM courses, club meets with real entry fees, other meet-type codes besides `O`/`LS`), re-validate every ⚠️ row above — several of the "constant across samples" observations are constant only because the sample set is small and homogeneous.

## 5. Relationship to HY3 (summary)

EV3 is the **input** to the meet-entry workflow: the conference host exports it from Meet Manager and distributes it to member schools. Each school imports the EV3 into their own Meet Manager, adds their swimmers' entries (drawing on each swimmer's historical best times to auto-seed), and exports a **HY3** file back to the host, who imports it to merge entries across all schools. See [hy3-spec.md §12](hy3-spec.md#12-relationship-to-ev3) for the full mapping table (event number identity, stroke/gender/course code reuse, the diving distance↔dive-count fold, and the course/meet-type code echoed into `B2`).
