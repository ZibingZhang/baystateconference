# HY3 File Format Specification

Derived primarily from the [SwimComm/hytek-parser](https://github.com/SwimComm/hytek-parser) Python library (a mature, community-maintained HY3 parser whose column offsets are validated against a corpus the maintainers describe as "9.25M records"), cross-checked byte-for-byte against two real files produced by Hy-Tek Meet Manager 8.0 for this project.

Confidence markers used throughout:
- ✅ **Confirmed** — matches the reference library **and** was independently re-derived from our real sample bytes.
- 📚 **From reference library, unverified here** — our samples are *entries* files (pre-meet) and contain no result data, so record types that only appear in *results* exports (`E2`, `F2`, `G1`, `H1`, `H2`) could not be independently re-checked against real bytes. Treat these as reliable (they come from a well-tested library) but not double-verified.
- ⚠️ **Observed anomaly** — our real data disagrees with, or falls outside, the reference library's documented column range. Called out explicitly.
- ❓ **Unknown** — byte range observed but meaning not determined.

## 1. Container format

- **Encoding**: ASCII / Windows-1252. Use `latin1` when reading in JS to safely pass through any stray high bytes without throwing.
- **Line ending**: CRLF (`\r\n`) — confirmed via hex dump of real files.
- **Record length**: every record is **exactly 130 bytes** before the CRLF: **128 bytes of fixed-width content**, followed by a **2-byte decimal checksum**. Confirmed on all 135 records across both sample files — no exceptions, regardless of record type.
- **Columns are 1-indexed** throughout this document (matching how Hy-Tek's own tooling and the reference library describe them) and **inclusive** on both ends. A field described as "cols 4–8" is 5 characters wide.
- **Field padding**: text fields are left-justified and space-padded to width; numeric ID fields are right-justified and space-padded (e.g. a swimmer meet-id of `1` in a 5-wide column renders as `    1`). Fields that don't apply to a given record are left as spaces, not omitted — the column position is what identifies a field, there is no delimiter.
- **No `*>` terminator** (unlike EV3) — the checksum's presence at a fixed offset is what marks record end.
- **No record framing/escaping** — a record is entirely positional. Two-character record-type codes appear at columns 1–2 of every record and determine how to interpret the remaining 126 content bytes.

### Extraction helper (used throughout this spec, matches the reference library's `extract()`)

```js
function extract(line, start1Based, length) {
  const start = start1Based - 1;
  return line.slice(start, start + length).trim();
}
```
`trim()` matters: numeric/date fields are frequently blank-padded (e.g. an unset altitude is 5 spaces, not `"0"`) — a naive `parseInt` on the untrimmed slice can behave unexpectedly, so always trim before interpreting.

## 2. Checksum algorithm (reverse-engineered and verified)

The public reference library explicitly does **not** implement checksum validation (`raise NotImplementedError`). This section is derived independently and **verified to match all 135 real records** across both sample files with zero mismatches, so it can be trusted for both validating and writing HY3 files.

Given the 128-byte content of a record (**before** appending the 2-digit checksum):

1. `sumEven` = sum of the character codes at 0-based indices `0, 2, 4, ..., 126` (the 64 "even" positions).
2. `sumOdd` = sum of the character codes at 0-based indices `1, 3, 5, ..., 127` (the 64 "odd" positions), **doubled**.
3. `total = sumEven + sumOdd`
4. `divided = Math.floor(total / 21)`
5. `raw = divided + 205`
6. Take `raw mod 100` → a 2-digit number (zero-padded, e.g. `07`). The checksum's **first character is the ones digit, second character is the tens digit** — i.e. the two digits are written in **reverse** order versus normal decimal notation.

```js
function hy3Checksum(body /* exactly 128 chars */) {
  let sumEven = 0;
  let sumOdd = 0;
  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i);
    if (i % 2 === 0) sumEven += code;
    else sumOdd += code;
  }
  const total = sumEven + sumOdd * 2;
  const divided = Math.floor(total / 21);
  const raw = (divided + 205) % 100;
  const tens = Math.floor(raw / 10);
  const ones = raw % 10;
  return `${ones}${tens}`;
}
```

To **validate** a line: `hy3Checksum(line.slice(0, 128)) === line.slice(128, 130)`.
To **write** a line: build the 128-char content (space-padded to width per field), then append `hy3Checksum(content)`, then `\r\n`.

## 3. File grammar

Records must appear in this order (brackets = optional, braces+`*` = repeated zero or more times):

```
A1                          file/software info                     (exactly 1)
B1                          meet info, primary                     (exactly 1)
B2                          meet info, secondary                   (exactly 1)
{
  C1                        team identity                          (1 per team)
  C2                        team address
  C3                        team contact info
  [C4]                      unknown per-team record (see §6.4)
  { D1 }*                   one swimmer on this team
}*                          — repeated once per team in the file
{
  E1                        individual event entry
    [ { E2 [G1]* [H1] [H2] } ]*   one result block per round actually swum (prelim/swimoff/final)
}*                          — repeated once per (swimmer, event) entry
{
  F1                        relay entry (one team+letter+event)
    [ { F2 [G1]* [H1] [H2] } ]*   one result block per round actually swum
  F3                        relay roster (the swimmers who swam this relay)
}*                          — repeated once per (team, relay letter, event) entry
[Z0]                        optional end-of-file sentinel
```

Notes derived from the real sample file (single team, 26 swimmers, 20 individual entries, 6 relay legs across 3 relay events):

- **Grouping is by swimmer, not by event.** All `D1`/`E1` records for one team are emitted together, swimmers in roughly alphabetical order by last name; a swimmer's `E1` line(s) immediately follow their own `D1` line.
- **Relay-only swimmers still get a standalone `D1` line** with no `E1` lines following it — their participation is declared later, once, via the `F3` roster line under each relay they actually swim. In the sample file, 5 of 26 `D1` swimmers (Huffenus, Kraft, O'Brien, Richmond, Saranathan) have no individual `E1` entries and appear only in `F3` legs.
- **`E1` never repeats for a given (swimmer, event) pair** — even if that swimmer's entry is later updated (e.g. seed time changes), Meet Manager holds one `E1` per entry and appends result rounds (`E2`) after it, not new `E1`s.
- **`F1`/`F3` are always paired** — every `F1` (a relay entry: which team, which letter — `A`/`B`/`C`... — for which event) is immediately followed by exactly one `F3` (the roster of swimmers who actually swam that relay, up to 8 legs for multi-leg medley/relay formats). All `F1`/`F3` pairs in the sample appear at the **end of the file**, after every team's `D1`/`E1` block, ordered event-number-then-letter (event 1 letters A/B/C, then event 17 letters A/B/C, then event 23 letters A/B/C).
- **Multi-team ordering** (C-block repeating per team) is inferred from the reference library's design — it tracks a stateful "last team" pointer that `D1` records attach to — but our real samples contain only one team each, so this could not be independently confirmed byte-for-byte. If you obtain a genuinely multi-team merged HY3 (e.g. a host's consolidated entries file across all conference schools), verify this ordering before relying on it.
- **`Z0` was never observed** in either real sample — both files end immediately after the last `F3` record, no trailing sentinel. The reference library treats `Z0` as optional and synthesizes one internally if missing, purely so its parsing loop has a defined stop condition; **do not require `Z0` on read, and it's optional to emit on write** (omitting it matches what Meet Manager itself produces).
- **`E2`/`F2`/`G1`/`H1`/`H2` never appear in an entries-only export** (they describe swim *results* — times, places, splits, DQs). They will appear when parsing a **results** HY3 (post-meet, e.g. exported for a `.hy3` results-import step or scored-meet backup), which is out of scope for the meet-entries workflow but documented below (§7.2, §8.2, §9–10) since the same file extension and grammar cover both use cases.

## 4. Shared value encodings

These alphabets are reused across many record types; define them once in the JS parser as shared enums (they're also reused by EV3 — see [ev3-spec.md](ev3-spec.md)).

| Enum | Values | Used in |
|---|---|---|
| **Gender** | `M`=Male, `F`=Female (case-insensitive; a lowercase byte should be upcased, not treated as unknown) | D1, E1, F1 |
| **GenderAge** | `M`=Men's, `B`=Boy's, `W`=Women's, `G`=Girl's | E1, F1 (col 15) — ⚠️ in our HS-conference samples this column is **not** populated with this alphabet; it simply repeats the single-char Gender code from the adjacent column instead (e.g. `F` for a girls' event, not `G`). Club/USA-S-style meets may populate it correctly; treat as unreliable for HS exports and prefer deriving age-classification from context. |
| **Stroke** | `A`=Free, `B`=Back, `C`=Breast, `D`=Fly, `E`=IM/Medley, `F`=1m diving, `G`=3m diving, `H`=platform diving | D... (via E1/F1) |
| **Course** | `Y`=SCY, `S`/`M`=SCM, `L`=LCM, `X`/` `=DQ/no-course | B2, E1, F1 |
| **MeetType** | 2-digit codes `00`–`0C`: `00` Time Trials, `01` Invitational, `02` Regional, `03` LSC Champs, `04` Zone, `05` Zone Champs, `06` National Champs, `07` Juniors, `08` Seniors, `09` Dual, `0A` International, `0B` Open, `0C` League | B2 — ⚠️ blank (`UNKNOWN`) in both real samples; the meaningful meet-type signal in our HS files instead lives in the free-text course/type code tacked onto the end of B2 (see §5.2) and originates from EV3 header field 6. |
| **ResultType** | `P`=Prelim, `F`=Final, `S`=Swimoff | E2, F2, G1 |
| **WithTimeTimeCode** | `" "`/`""`=Normal, `R`=No-show, `S`=Scratch, `Q`=DQ, `F`=False start, `D`=DNF, other=Unknown | E2, F2 |
| **DisqualificationCode** | 2-char codes grouped by stroke: `1x`=Fly, `2x`=Back, `3x`=Breast, `4x`=Free, `5x`=IM, `6x`=Relay, `7x`=Misc (full table in reference library's `hy3/enums.py`; reproduce verbatim if the JS parser needs to label DQ reasons) | E2, F2 |
| **ReplacedTimeTimeCode** | `NT`=No time, `NS`=No show, `DNF`, `DQ`, `SCR`=Scratch | any time field, in place of a numeric time |

## 5. File & meet records

### 5.1 `A1` — File info (exactly one, first record in file)

Real sample: `A102Meet Entries             Hy-Tek, Ltd    Win-TM 8.0Gb  10192025  4:56 PMNeedham High School                                  `

| Field | Cols | ✅/📚 | Sample | Notes |
|---|---|---|---|---|
| Record code | 1–2 | ✅ | `A1` | |
| Sub-type / version | 3–4 | ❓ | `02` | Not parsed by the reference library; observed constant `02` in both samples. |
| File description | 5–29 | ✅ | `Meet Entries` | Free text, describes file purpose (e.g. "Meet Entries" vs "Meet Results"). |
| Software name | 30–44 | ✅ | `Hy-Tek, Ltd` | |
| Software version | 45–54 | ✅ | `Win-TM 8.0Gb` | |
| Date/time created | 59–75 | ✅ | `10192025  4:56 PM` | Format `MMDDYYYY H:MM AM/PM` — note the hour is space-padded not zero-padded (`" 4:56 PM"`), which the reference parser patches (`raw_date[9] == " "` → insert `"0"`) before calling `strptime("%m%d%Y %I:%M %p")`. Implement the same patch in JS: if the character right after the space-padded hour position is a space, insert a `0`. |
| Licensee | 76–128 | ✅ | `Needham High School` | The name of the entity that owns the Meet Manager license generating **this specific file** — for an entries file, this is the submitting school, not the meet host (contrast with EV3's licensee field, which names the host's conference operator). |

### 5.2 `B2` — Secondary meet info (exactly one)

(`B1` is covered by §5.2's neighbor below — order kept side-by-side since they share structure; see table.)

Real sample: `B2                                                                                                Y   0.00YO                    `

| Field | Cols | ✅/📚 | Sample | Notes |
|---|---|---|---|---|
| Record code | 1–2 | ✅ | `B2` | |
| Notes | 3–47 | ✅ | *(blank)* | Free text; `null`/blank in both samples. |
| *(unused/unknown)* | 48–93 | ❓ | *(blank)* | |
| Masters flag | 94–95 | 📚 | *(blank)* | Reference library treats `"06"` as `true`; blank/anything else `false`. |
| *(unknown)* | 96 | ❓ | *(blank)* | |
| Meet type | 97–98 | ✅ | *(blank)* | See `MeetType` enum (§4) — blank in both real samples (⚠️ resolves to `UNKNOWN`). |
| Course | 99 | ✅ | `Y` | See `Course` enum. Confirmed SCY in both samples (matches EV3 header field 6's leading `Y`). |
| *(numeric field, purpose unconfirmed)* | 100–106 | ⚠️ | `   0.00` | Constant `0.00` (7 chars, right-aligned) in both samples — possibly a default fee/surcharge amount. Not parsed by the reference library. |
| **Course+type code (from EV3)** | 107–108 | ✅ | `YO` (Bay State) / `YL` (MIAA Fall) | **Confirmed cross-format link**: this exactly matches the leading characters of the source EV3 file's header field 6 (`YO` for the dual meet, `YLS` for the MIAA sectional — truncated here to 2 characters). This is concrete evidence Meet Manager round-trips the EV3 event file's course/meet-type tag into the generated entries file. See [ev3-spec.md §5](ev3-spec.md#5-relationship-to-hy3-summary). |
| Sanction number | 109–128 | ✅ | *(blank)* | Blank in both samples (dual meet / conference meet, no LSC sanction). |

**`B1` — Primary meet info** (exactly one, immediately precedes `B2`):

Real sample: `B12025 Fall Bay State Conference                Wheaton College                              102420251026202509012025            `

| Field | Cols | ✅/📚 | Sample | Notes |
|---|---|---|---|---|
| Record code | 1–2 | ✅ | `B1` | |
| Meet name | 3–47 | ✅ | `2025 Fall Bay State Conference` | Matches EV3 header field 1. |
| Facility | 48–92 | ✅ | `Wheaton College` | Matches EV3 header field 2. |
| Start date | 93–100 | ✅ | `10242025` | `MMDDYYYY`, no separators. Matches EV3 header field 3 (re-encoded from `MM/DD/YYYY`). |
| End date | 101–108 | ✅ | `10262025` | `MMDDYYYY`. Matches EV3 header field 4. |
| *(unknown — holds a date, possibly the entries-deadline)* | 109–116 | ⚠️ | `09012025` | Same `MMDDYYYY` shape; value equals the EV3 header field 5/17 (entries-due / roster-lock date) in this sample. Not parsed by the reference library. |
| Altitude | 117–121 | ✅ | *(blank)* | Integer meters, blank if unspecified. |
| *(unused)* | 122–128 | ❓ | *(blank)* | |

### 5.3 Meet-header pair together

Read `B1` and `B2` as one logical "meet" record split across two physical lines — this mirrors how the reference library merges them into a single `Meet` object.

## 6. Team records (one block per team)

### 6.1 `C1` — Team identity

Real sample: `C1NEED Needham High School           Needham           Elisabeth McQuaid             Zibing Zhang                       HS      `

| Field | Cols | ✅/📚 | Sample | Notes |
|---|---|---|---|---|
| Record code | 1–2 | ✅ | `C1` | |
| Team code | 3–7 | ✅ | `NEED` | Up to 5 chars. If blank, the reference library synthesizes one from the team name's initials (first 2 letters of each capitalized word, truncated to 5) — replicate this fallback if writing files for systems that tolerate a missing code, but prefer always emitting a real code. |
| Team full name | 8–37 | ✅ | `Needham High School` | |
| Team short name | 38–53 | ✅ | `Needham` | |
| LSC / region code | 54–55 | ✅ | *(blank in this HS sample)* | 2-letter code (e.g. `NE`, `PC`). ⚠️ Historical bug note carried from the reference library: an earlier version of that parser read this at cols 54–56 (3 chars), which bled into the first letter of the contact name at col 56 and corrupted ~19% of parsed LSC codes in their corpus — **use exactly cols 54–55**, not 54–56. |
| Contact name 1 | 56–85 | ✅ | `Elisabeth McQuaid` | |
| Contact name 2 | 86–115 | ✅ | `Zibing Zhang` | Often identical to contact 1; blank slot means "not set," not an error. |
| *(unknown, holds e.g. `HS`)* | 116–128 | ⚠️ | `HS` | Not parsed by the reference library. In our sample this literally reads `HS` — plausibly a team-classification code (High School) distinct from `MeetType`. Unverified beyond this single value. |

### 6.2 `C2` — Team address

Real sample: `C2                                                                                          MA          USA OTH                 `

| Field | Cols | ✅ | Sample | Notes |
|---|---|---|---|
| Record code | 1–2 | ✅ | `C2` | |
| Address line 1 | 3–32 | ✅ | *(blank)* | Free-text "care of"/attention line — often a contact person or org name, not necessarily a street. |
| Address line 2 | 33–62 | ✅ | *(blank)* | The actual street address, when present. |
| City | 63–92 | ✅ | *(blank)* | |
| State | 93–94 | ✅ | `MA` | 2-letter USPS code. |
| ZIP | 95–104 | ✅ | *(blank)* | Up to 10 chars (supports ZIP+4). |
| Country | 105–107 | ✅ | `USA` | 3-letter code; if blank, the reference library substitutes a caller-supplied default (`"USA"`). |
| *(unknown — holds e.g. `OTH`)* | 108–128 | ⚠️ | `OTH` | Not parsed by the reference library. Unverified; possibly a team-type/affiliation tag. |

### 6.3 `C3` — Team contact info

Real sample: `C3                                                                                                                              ` (entirely blank in our sample except the record code)

| Field | Cols | ✅ | Notes |
|---|---|---|
| Record code | 1–2 | ✅ | `C3` |
| *(unknown)* | 3–32 | ❓ | Blank in sample. |
| Daytime phone | 33–52 | ✅ | Reference library substitutes `"N/A"` if blank. |
| Evening phone | 53–72 | ✅ | Same fallback. |
| Fax | 73–92 | ✅ | Same fallback. |
| Email | 93–128 | ✅ | Same fallback. |

### 6.4 `C4` — Unknown per-team/per-file record ❓

**Not present in the reference library at all** — `parse_hy3` logs `Invalid line code: C4` and skips it when this exact real file is run through it. Observed once in our sample, immediately after `C3` and before the first `D1`:

```
C4Kate Curtin
```

| Field | Cols | Notes |
|---|---|---|
| Record code | 1–2 | `C4` |
| Free text | 3–128 | `Kate Curtin` left-justified, rest blank. |

⚠️ Best guess only: given `C1` already carries two contact-name slots (meet contact + a secondary), `C4` plausibly holds the team's **head coach name** (a distinct role from the meet-entry contact). Only one team was present in our sample, so it's also unconfirmed whether `C4` is emitted once per team or once per file. A JS parser should recognize this record type (rather than erroring or silently dropping it like the reference library does) and preserve its raw text, without asserting strong semantics on it.

## 7. Swimmer & individual-event records

### 7.1 `D1` — Swimmer roster entry (one per swimmer)

Real sample: `D1F   56Huffenus            Aida                                                                  029                           `

| Field | Cols | ✅/📚/⚠️ | Sample | Notes |
|---|---|---|---|---|
| Record code | 1–2 | ✅ | `D1` | |
| Gender | 3 | ✅ | `F` | See `Gender` enum. |
| Meet ID | 4–8 | ✅ | `56` | Integer, right-justified. This is the **primary key** used to link a swimmer to their `E1`/`F3` entries elsewhere in the file — unique within the file, not a persistent USA-Swimming-wide ID. |
| Last name | 9–28 | ✅ | `Huffenus` | |
| First name | 29–48 | ✅ | `Aida` | |
| Nickname | 49–68 | ✅ | *(blank)* | |
| Middle initial | 69 | ✅ | *(blank)* | |
| USA Swimming ID | 70–83 | ✅ | *(blank)* | Blank in HS-only meets that don't track USA-S membership numbers. |
| Team ID | 84–88 | ✅(📚) | *(blank in this row)* | Integer, links to an internal team record. Blank/`None` was the norm across every swimmer in our single-team sample — **not independently confirmed with a populated value**, since only one team was present so there was nothing to disambiguate. |
| Date of birth | 89–96 | ✅ | *(blank)* | `MMDDYYYY`, blank if not tracked (common for HS meets). |
| Age | 97–99 | ⚠️ | `  0` | Per the reference library this is a plain integer age; every swimmer in both real samples reads `0` here (consistent with DOB also being blank — Meet Manager can't compute age without a birth date, and doesn't fall back to anything else). |
| Class year | 100–101 | ⚠️ | `29` | Reference library documents this as `"Fr"/"So"/"Jr"/"Sr"` in some exports, "other data" in others. **Observed anomaly**: in both real HS samples this holds the *last two digits of a graduating class year* — e.g. `29`, `27`, `26`, `28`, matching Class of 2029/2027/2026/2028 for a 2025–26 HS roster (freshman through senior). One outlier swimmer read `1528` across this-and-adjacent columns, which doesn't fit the pattern and is presumed to be a data-entry irregularity in the source roster rather than a format bug. Treat this whole 97–101 region as "age-or-class-year, HS exports favor the class-year reading" and avoid hard-coding an interpretation that assumes numeric age. |
| *(unused)* | 102–112 | ❓ | *(blank)* | |
| Citizenship | 113–115 | ✅ | *(blank)* | `USA` or blank, per reference library. |
| *(unused)* | 116–124 | ❓ | *(blank)* | |
| Status | 125 | ✅ | *(blank)* | Athlete status code; only `N` (Normal) or blank observed by the reference library across its whole corpus. |
| *(unused)* | 126–128 | ❓ | *(blank)* | |

### 7.2 `E1` — Individual event entry (one per swimmer×event)

Real sample: `E1F    1AfzalFF   200E  0109      0.00  5        0Y  152.49Y                               C                                    `

| Field | Cols | ✅/📚 | Sample | Notes |
|---|---|---|---|---|
| Record code | 1–2 | ✅ | `E1` | |
| *(redundant gender, unused by parser)* | 3 | ✅ | `F` | Duplicates the swimmer's `D1` gender; not separately parsed. |
| Swimmer meet ID | 4–8 | ✅ | `1` | Foreign key into `D1`'s meet-ID column. |
| *(truncated last name, display-only)* | 9–13 | ✅ | `Afzal` | First 5 chars of last name; cosmetic, safe to ignore when parsing, but if writing files include it for compatibility with tools that display it. |
| Event gender | 14 | ✅ | `F` | See `Gender` enum. |
| Event gender-age | 15 | ⚠️ | `F` | See `GenderAge` enum — ⚠️ see §4 note: HS exports duplicate the gender letter here instead of using the M/B/W/G alphabet. |
| Distance | 16–21 | ✅ | `200` | Integer. For diving events, this holds the **dive count**, not a swum distance (see [ev3-spec.md §3](ev3-spec.md#3-event-record-lines-2n), field 11 — confirmed cross-format: EV3's separate distance=0/dive-count=6 pair collapses into a single HY3 distance value of `6`). |
| Stroke | 22 | ✅ | `E` | See `Stroke` enum. |
| Age min | 23–25 | ✅ | `0` | `0`+`109` = open/unrestricted, matching EV3. |
| Age max | 26–28 | ✅ | `109` | |
| *(unused)* | 29–32 | ❓ | *(blank)* | |
| Event fee | 33–38 | ✅ | `0.00` | Decimal, 2 places. |
| Event number | 39–42 | ✅ | `5` | **Confirmed to equal EV3's event-line field 1 exactly** — this is the join key between the two formats for a given event. |
| Converted seed time | 43–50 | ✅ | *(blank → 0)* | Seed time converted to the meet's course (`event.course`), for cross-course seeding. Format is bare seconds or `M:SS.hh` — see `parse_time` handling below. |
| Event course | 51 | ✅ | `Y` | See `Course` enum — the course the *event itself* swims in. |
| Seed time | 52–59 | ✅ | `152.49` | The swimmer's actual entered seed time, in the event's native course. May instead hold a `ReplacedTimeTimeCode` string (`NT`, `NS`, `DNF`, `DQ`, `SCR`) in place of a number — parse permissively: try `parseFloat`/`M:SS.hh` first, fall back to the code enum. |
| Seed course | 60 | ✅ | `Y` | Course the seed time itself was swum in (may differ from event course — that's what "converted seed time" at cols 43–50 is for). |
| *(unused)* | 61–76 | ❓ | *(blank)* | |
| Meet division (primary) | 77–79 | 📚 | *(blank)* | Host-configured division label (`JV`/`VR`, `A`/`AA`/`AAA`/`BB`, `5A`/`4A`/`3A`, `AG`/`SR`, or numeric). Takes precedence over cols 92–93 when both are populated (older/other MM versions use one or the other, never both). |
| *(unused)* | 80–83 | ❓ | *(blank)* | |
| Exhibition flag | 84 | ✅ | *(blank)* | Literal `X` marks an exhibition (non-scoring) entry; anything else (including blank) is a normal entry. |
| *(unused)* | 85–91 | ❓ | *(blank)* | |
| Meet division (alt.) | 92–93 | ⚠️ | `C ` | Secondary location for the meet-division label, used by "MM4/MM5-7.0Fa"-era exports per the reference library. In our sample this literally holds `C` — read together with the "primary" slot's precedence rule above. |
| *(unused)* | 94–128 | ❓ | *(blank)* | |

**Time parsing** (`M:SS.hh` or bare `SS.hh`): try `parseFloat` on a plain numeric string first (bare seconds, e.g. `"27.73"` → `27.73`); if the string contains a `:`, split on it and compute `minutes*60 + seconds` (e.g. `"2:15.55"` → `135.55`); if neither parses as a number, match against `ReplacedTimeTimeCode` (`NT`/`NS`/`DNF`/`DQ`/`SCR`).

### 7.3 `E2` — Individual event result (results files only) 📚

Not present in our entries-only samples; documented from the reference library, which the maintainers note is validated against a large results-file corpus (their comments specifically call out edge cases like negative reaction times and NRT sentinels being load-bearing, evidence of real-world hardening).

One `E2` follows the `E1` per round actually swum (prelim, swimoff, final) — the round is field 1 below.

| Field | Cols | Notes |
|---|---|---|
| Record code | 1–2 | `E2` |
| Round | 3 | `P`/`F`/`S` — see `ResultType` enum. Determines which of `prelim_*`/`finals_*`/`swimoff_*` this record populates. |
| Time | 4–11 | Same permissive numeric-or-code parsing as `E1`'s seed time. |
| Course | 12 | `Course` enum. |
| Time code | 13 | `WithTimeTimeCode` enum — normal/no-show/scratch/DQ/false-start/DNF. |
| DQ code | 14–15 | Only meaningful when the time code is a DQ variant (`Q`/`F`/`D`) — see `DisqualificationCode` enum. |
| *(unused)* | 16–20 | |
| Heat | 21–23 | Integer. |
| Lane | 24–26 | Integer. |
| Heat place | 27–29 | Integer. |
| Overall place | 30–33 | Integer. |
| Button 1 time | 39–46 | Touchpad/backup button reading. |
| Button 2 time | 47–54 | |
| Button 3 time | 55–62 | |
| Pad time | 63–74 | Primary touchpad time. |
| Backup 4 time | 75–82 | |
| Reaction time | 83–87 | ⚠️ **Signed** — a negative value here is a legitimate early relay exchange, not an error; only treat blank / any-sign `0.00` / literal `NRT` as "not recorded." Do not clamp to non-negative. |
| Date | 88–95 | `MMDDYYYY`, date this round was actually swum. |
| Alt time code | 96 | Observed values `A`/`K`/blank; semantics not confirmed by the reference library either. |
| *(unused)* | 97–128 | |

Timing-column values of `0.00` (in any sign) or blank mean "not recorded," and should parse to `null`/`undefined`, not `0`.

### 7.4 `H1` / `H2` — DQ reason & detail (results files only) 📚

Follow an `E2`/`F2` immediately when that record's time code was a DQ variant.

| Record | Cols | Field | Notes |
|---|---|---|---|
| `H1` | 5–128 | Reason string | Free text human-readable DQ reason. Attaches to the DQ slot (prelim/swimoff/finals) that the *immediately preceding* `E2`/`F2` populated — this positional anchoring is the only reliable way to disambiguate a swimmer DQ'd in both prelims and finals with the *same* DQ code, since the code alone can't tell the two apart. |
| `H2` | 5–128 | Infraction detail | A second free-text string with the specific stroke/leg infraction description (not the same code space as `DisqualificationCode` — e.g. `"2L"` here is a stroke-technique note, not the record's DQ code). Same positional-anchoring rule as `H1`. |

A JS implementation should track "which result slot did the last `E2`/`F2` populate" as parser state, exactly as the reference library does, and attach any following `H1`/`H2` to that slot — clearing the pointer whenever a non-DQ result is parsed so a later orphaned `H1`/`H2` can't misattach to a stale slot.

### 7.5 `G1` — Split times (results files only) 📚

| Field | Cols | Notes |
|---|---|---|
| Record code | 1–2 | `G1` |
| Round | 3 | `ResultType` enum — which round these splits belong to. |
| Splits | 4 onward | Repeating 11-char groups: 2-char split number + 8-char split time (parsed the same permissive way as other time fields), then 1 unexplained filler char per group (the reference library's own comment flags this as "MM for some reason specifies P/S/F every time???" — i.e. even the reference authors aren't fully sure why the stride is 11 rather than 10). Stop at the first blank character or column 124. |

## 8. Relay records

### 8.1 `F1` — Relay entry (one per team×letter×event)

Real sample: `F1NEED A   0FFF   200E  0109      0.00  1        0Y  119.64Y                                                                    `

| Field | Cols | ✅ | Sample | Notes |
|---|---|---|---|
| Record code | 1–2 | ✅ | `F1` | |
| Team code | 3–7 | ✅ | `NEED` | Matches `C1`'s team code. |
| Relay team letter | 8 | ✅ | `A` | `A`, `B`, `C`... distinguishes a school's 1st/2nd/3rd relay team in the same event. |
| *(unused)* | 9–13 | ❓ | *(blank + stray `F`)* | |
| Gender | 14 | ✅ | `F` | |
| Gender-age | 15 | ⚠️ | `F` | Same HS-export caveat as `E1`. |
| Distance | 16–21 | ✅ | `200` | Total relay distance (all legs combined), or 0 for a diving-style event (not applicable to relays in practice). |
| Stroke | 22 | ✅ | `E` | `E`=Medley Relay, `A`=Free Relay, etc. |
| Age min | 23–25 | ✅ | `0` | Set at `F1` time since individual swimmer ages aren't known until `F3` is parsed; the reference library refines the event's overall age range afterward using the lowest-numbered leg's swimmer. |
| Age max | 26–28 | ✅ | `109` | |
| *(unused)* | 29–32 | ❓ | *(blank)* | |
| Event fee | 33–38 | ✅ | `0.00` | |
| Event number | 39–42 | ✅ | `1` | Same join-key role as `E1`'s event number; matches EV3 event-line field 1. |
| Converted seed time | 43–50 | ✅ | *(blank → 0)* | |
| Event course | 51 | ✅ | `Y` | |
| Seed time | 52–59 | ✅ | `119.64` | The relay's entered/composite seed time. |
| Seed course | 60 | ✅ | `Y` | |
| *(unused)* | 61–128 | ❓ | *(blank)* | |

### 8.2 `F2` — Relay result (results files only) 📚

Identical column layout to `E2` (§7.3: round, time, course, time code, DQ code, heat/lane/place columns), **except** the reaction-time region is 4 slots wide instead of 1, shifting the trailing columns:

| Field | Cols | Notes |
|---|---|---|
| *(cols 3–62 identical to `E2`)* | 3–62 | Round, time, course, time code, DQ code, heat, lane, heat place, overall place, buttons 1–3. |
| Pad time | 63–74 | Same as `E2`. |
| Backup 4 time | 75–82 | Same as `E2`. |
| Reaction times ×4 | 83–102 | Four consecutive 5-char signed reaction-time slots (legs 1–4). Slot 1 is the leadoff swimmer's start reaction time; slots 2–4 are exchange takeover times, and are legitimately **negative** when a swimmer leaves the block early (this is meaningful data, not an error — do not discard or clamp). |
| Date | 103–110 | Shifted vs. `E2`'s col 88 to make room for the extra reaction-time slots. |
| Alt time code | 111 | Shifted vs. `E2`'s col 96 for the same reason. |

### 8.3 `F3` — Relay roster (one per `F1`, immediately following it)

Real sample: `F3F    1AfzalF1F   60PorteF2F    8GuarrF3F   55CheunF4                                                                          `

Structured as up to 8 repeating 13-char leg blocks starting at column 4:

```
for leg in 0..7:
  offset = leg * 13
  meetId = extract(line, 4 + offset, 5)     // swimmer meet-id, FK into D1
  legNumber = extract(line, 15 + offset, 1) // 1-based leg number, as swum
  if meetId is not a valid integer: stop    // fewer than 8 legs is normal
```

| Sub-field | Relative cols within each 13-char block | Notes |
|---|---|---|
| Swimmer meet ID | 0–4 | The only field actually consumed by the reference parser. |
| *(truncated last name, display-only)* | 5–9 | Cosmetic, 5 chars, same convention as `E1`'s. Byte-verified: block 0 in the sample reads `Afzal` (Chloe Afzali, leg 1). |
| *(literal `F` + leg number + literal `F`)* | 10–12 | Byte-verified pattern: e.g. block 0's last 3 chars are `F1F` — a literal `F`, the 1-based leg number (`1`), then a literal `F` that is actually the *first* character of the *next* leg's own 13-char block prefix (block 1 starts with `F` too, from `F2` in the sample). The reference parser only reads the middle digit (leg number) at absolute col `15+offset`; treat the two `F` characters as structural filler rather than independent fields when writing new files (mirror the exact byte pattern for compatibility, but don't assign them separate meaning). |
| *(only 2 chars remain on the final populated leg)* | — | The last leg's block is naturally short (e.g. `...55CheunF4 ` — no trailing "next-block F" because there is no next block); the rest of the 128-byte record is simply space padding. |

The reference parser is deliberately tolerant here: a leg number that references a `meetId` with no matching `D1` record is skipped (not fatal — real-world incomplete exports do this), and a missing leg 1 doesn't crash the age-range refinement step (it uses `min(legs present)` instead of assuming leg 1 exists).

## 9. Enums reference (full detail)

Reproduce these verbatim in the JS implementation — see the reference library's `hy3/enums.py` for the complete `DisqualificationCode` table (48 codes) if DQ-reason labeling is needed; it's reproduced in full there and not repeated here since it's mechanical (stroke-number prefix `1`–`7` + letter suffix, e.g. `2L` = "back, shoulders past vertical towards the breast").

## 10. End-to-end parsing algorithm (JS)

```js
function parseHy3(buffer) {
  const text = buffer.toString('latin1');
  const lines = text.split('\r\n').filter(l => l.length > 0);

  if (lines[0].slice(0, 2) !== 'A1') {
    throw new Error('Not a HY3 file');
  }

  const state = { meet: null, lastTeam: null, lastEntry: null, lastDqSlot: null };
  const handlers = { A1: parseA1, B1: parseB1, B2: parseB2, C1: parseC1, C2: parseC2,
                      C3: parseC3, C4: parseC4, D1: parseD1, E1: parseE1, E2: parseE2,
                      F1: parseF1, F2: parseF2, F3: parseF3, G1: parseG1, H1: parseH1, H2: parseH2 };

  for (const line of lines) {
    const code = line.slice(0, 2);
    if (code === 'Z0') break;               // optional sentinel — stop if present
    const body = line.slice(0, 128);        // strip the 2-char checksum before field extraction
    const handler = handlers[code];
    if (!handler) { /* unknown record type — log and preserve raw, don't throw */ continue; }
    handler(body, state);
  }
  return state.meet;
}
```

## 11. End-to-end writing algorithm (JS)

```js
function writeHy3(meet) {
  const records = [];
  records.push(serializeA1(meet));
  records.push(serializeB1(meet));
  records.push(serializeB2(meet));
  for (const team of meet.teams) {
    records.push(serializeC1(team), serializeC2(team), serializeC3(team));
    if (team.headCoach) records.push(serializeC4(team));
    for (const swimmer of team.swimmers) records.push(serializeD1(swimmer));
  }
  for (const entry of meet.individualEntries) {
    records.push(serializeE1(entry));
    for (const round of entry.results) records.push(serializeE2(round), ...serializeResultExtras(round));
  }
  for (const relay of meet.relayEntries) {
    records.push(serializeF1(relay));
    for (const round of relay.results) records.push(serializeF2(round), ...serializeResultExtras(round));
    records.push(serializeF3(relay));
  }
  // No Z0 needed — real Meet Manager exports omit it.

  return records.map(body => {
    const padded = body.padEnd(128, ' ').slice(0, 128); // enforce exactly 128 chars
    return padded + hy3Checksum(padded);
  }).join('\r\n') + '\r\n';
}
```
Each `serializeXX` function is the mirror image of the column tables in §5–8: write the record code at cols 1–2, then place every field at its documented column range, left-justifying text and right-justifying numeric IDs, space-filling everything else — then let the loop above append the checksum.

## 12. Relationship to EV3

This is the practical bridge a JS entries-pipeline implementation actually needs, gathered from every cross-format correlation confirmed while building both specs:

| EV3 | HY3 | Relationship |
|---|---|---|
| Event-line field 1 (event number) | `E1`/`F1` event number (cols 39–42) | **Identical value.** This is the join key: given an EV3 event and a school's HY3 entries, match on this number to know which event a given `E1`/`F1` fulfills. |
| Event-line field 6 (gender-age code) | `E1`/`F1` gender (col 14) | Same single-letter alphabet, though HY3's *dedicated* gender-age column (col 15) is unreliable in HS exports (see §4) — prefer EV3 as the source of truth for age-group/gender-age labeling when both are available. |
| Event-line field 10 (stroke) | `E1`/`F1` stroke (col 22) | Identical single-character alphabet (`A`–`H`) shared verbatim between the two formats — implement one shared `Stroke` enum for both parsers. |
| Event-line fields 7–8 (age min/max) | `E1`/`F1` age min/max (cols 23–28) | Identical values and identical "0/109 = open" sentinel convention. |
| Event-line fields 9 + 11 (distance, dive-count-or-fee) | `E1`/`F1` distance (cols 16–21) | **Collapsing transformation**: for diving events, EV3 keeps distance (`0`) and dive-count (`6`, `11`, ...) as two separate fields; HY3 folds them into one — the single HY3 "distance" value *is* the dive count. Confirmed against real data: EV3 event 9 (`stroke=F`, `distance=0`, `field11=6`) corresponds to the HY3 entry parsed as `distance=6.0, stroke=DIVING_1M`. |
| Event-line field 21 (qualifying time) | *(no direct HY3 field)* | The qualifying/time-standard used to validate whether a swimmer is even eligible to be entered — this is enforced during entry in Meet Manager and does not itself appear as a labeled field in the resulting HY3; the swimmer's actual seed time (`E1`/`F1` cols 52–59) is what carries forward. |
| Header field 6 (course+meet-type code, e.g. `YLS`) | `B2` cols 107–108 | **Confirmed byte-level match** (truncated to 2 chars): the meet-level course/type tag from the EV3 header is copied into the generated entries file's `B2` record. |
| Header fields 1–4 (meet name, facility, dates) | `B1` meet name/facility/dates | Direct copy-through, just re-encoded (`MM/DD/YYYY` in EV3 → `MMDDYYYY` in HY3). |
| *(not present — EV3 has no seed times for a dual meet with no standard)* | `E1`/`F1` seed time (cols 52–59) | Seed times are **not** sourced from EV3 at all — they come from each swimmer's historical best-times database inside the entering school's own Meet Manager, populated at entry time. This is the core value-add of the entries step: EV3 defines *what* events exist; HY3 supplies *who* is swimming them and *how fast* they've gone. |

**Practical implication for a JS pipeline**: parse the host's EV3 to build the canonical event list (numbers, strokes, genders, age groups, qualifying standards), let each school produce entries against that event list (with real swimmer data + historical seed times), and serialize the result as HY3 using the same event-number keys — a round-trip identity the two real Meet Manager exports in this repo's `data/` directory demonstrate is exactly how Hy-Tek itself does it.
