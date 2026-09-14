/**
 * Fixed-width field helpers shared by the HY3 (and, loosely, EV3) readers/writers.
 * Column numbers throughout this library are 1-indexed and inclusive, matching
 * docs/hytek/hy3-spec.md and docs/hytek/ev3-spec.md.
 */

import type { ReplacedTimeCode, SwimTime } from "./enums.ts";
import { isReplacedTimeCode } from "./enums.ts";

/** Extract a 1-indexed, inclusive-length substring and trim it, like the reference parser's `extract()`. */
export function extract(line: string, start1Based: number, length: number): string {
  const start = start1Based - 1;
  return line.slice(start, start + length).trim();
}

/** Extract without trimming — occasionally needed to detect "all spaces" vs "empty". */
export function extractRaw(line: string, start1Based: number, length: number): string {
  const start = start1Based - 1;
  return line.slice(start, start + length);
}

export type Justify = "left" | "right";

/**
 * Write `value` into `buf` (a mutable array of single characters, at least
 * `start1Based - 1 + length` long) at the given 1-indexed column range.
 * Text fields are left-justified; numeric/ID fields are right-justified,
 * matching the padding convention documented in hy3-spec.md §1.
 */
export function writeField(
  buf: string[],
  start1Based: number,
  length: number,
  value: string,
  justify: Justify = "left",
): void {
  const truncated = value.slice(0, length);
  const padded =
    justify === "left" ? truncated.padEnd(length, " ") : truncated.padStart(length, " ");
  const start = start1Based - 1;
  for (let i = 0; i < length; i++) {
    buf[start + i] = padded[i];
  }
}

/** Create a 128-char, space-filled record buffer with the 2-char record code at cols 1-2. */
export function createRecordBuffer(code: string): string[] {
  const buf = new Array<string>(128).fill(" ");
  writeField(buf, 1, 2, code, "left");
  return buf;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Parse an 8-char `MMDDYYYY` field (HY3-style, no separators). Returns undefined if blank/invalid. */
export function parseCompactDate(raw: string): Date | undefined {
  const v = raw.trim();
  if (v.length !== 8) return undefined;
  const mm = Number(v.slice(0, 2));
  const dd = Number(v.slice(2, 4));
  const yyyy = Number(v.slice(4, 8));
  if (!mm || !dd || !yyyy) return undefined;
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Format a Date as an 8-char `MMDDYYYY` field (HY3-style). */
export function formatCompactDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  return `${mm}${dd}${yyyy}`;
}

/** Parse a `MM/DD/YYYY` field (EV3-style). Returns undefined if blank/invalid. */
export function parseSlashDate(raw: string): Date | undefined {
  const v = raw.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (!m) return undefined;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Format a Date as a `MM/DD/YYYY` field (EV3-style). */
export function formatSlashDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Parse the HY3 A1 "date created" field: `MMDDYYYY H:MM AM/PM`, where the hour
 * is space-padded rather than zero-padded (e.g. `10192025  4:56 PM`). See
 * hy3-spec.md §5.1 for the `strptime`-compatible patch this mirrors.
 */
export function parseHy3DateTime(raw: string): Date | undefined {
  const m = /^(\d{2})(\d{2})(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(raw.trim());
  if (!m) return undefined;
  const [, mm, dd, yyyy, hh, min, ampm] = m;
  let hour = Number(hh) % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), hour, Number(min));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function formatHy3DateTime(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const hour24 = d.getHours();
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  // Hour is space-padded (not zero-padded) to match real Meet Manager output.
  return `${mm}${dd}${yyyy} ${String(hour12).padStart(2, " ")}:${min} ${ampm}`;
}

/** Parse an EV3-style clock time, e.g. `10:30AM`. Returns undefined if blank/invalid. */
export function parseClockTime(raw: string): { hour: number; minute: number } | undefined {
  const m = /^(\d{1,2}):(\d{2})(AM|PM)$/i.exec(raw.trim());
  if (!m) return undefined;
  let hour = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") hour += 12;
  return { hour, minute: Number(m[2]) };
}

export function formatClockTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")}${ampm}`;
}

// ---------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------

/**
 * Parse a swim-time field. Accepts bare seconds (`27.73`), `M:SS.hh` (`2:15.55`),
 * or one of the ReplacedTimeCode strings (`NT`, `NS`, `DNF`, `DQ`, `SCR`).
 * Blank input returns undefined (field not present).
 */
export function parseSwimTime(raw: string): SwimTime | undefined {
  const v = raw.trim();
  if (v === "") return undefined;
  if (isReplacedTimeCode(v)) return v as ReplacedTimeCode;
  if (v.includes(":")) {
    const [minPart, secPart] = v.split(":");
    const minutes = Number(minPart);
    const seconds = Number(secPart);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return minutes * 60 + seconds;
    }
    return undefined;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Format a SwimTime for a HY3 field. HY3 always writes bare decimal seconds —
 * confirmed against real samples up to 6+ minutes (e.g. `391.82`, never
 * `6:31.82`) — unlike EV3's qualifying-time field, which does use `M:SS.hh`.
 * The one exception is exact zero, HY3's "not applicable" sentinel for the
 * converted-seed-time column, which is written as bare `0` with no decimal.
 */
export function formatSwimTime(time: SwimTime | undefined): string {
  if (time === undefined) return "";
  if (typeof time === "string") return time;
  if (time === 0) return "0";
  return time.toFixed(2);
}

/**
 * Parse a time field where blank / any-sign `0.00` means "not recorded" — used
 * for the pad/backup-button and reaction-time columns in E2/F2 (which are
 * `undefined`-or-number, never a ReplacedTimeCode). Negative values are kept:
 * they're meaningful for relay-exchange reaction times.
 */
export function parseOptionalNumericTime(
  raw: string,
  opts: { allowNegative?: boolean } = {},
): number | undefined {
  const v = raw.trim();
  if (v === "" || v.toUpperCase() === "NRT") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  if (n === 0) return undefined;
  if (!opts.allowNegative && n < 0) return undefined;
  return n;
}

export function formatOptionalNumericTime(value: number | undefined): string {
  if (value === undefined) return "";
  return value.toFixed(2);
}

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------

/** Parse an integer field, returning undefined for blank/non-numeric content. */
export function parseIntOrUndefined(raw: string): number | undefined {
  const v = raw.trim();
  if (v === "") return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a decimal field, returning undefined for blank/non-numeric content. */
export function parseFloatOrUndefined(raw: string): number | undefined {
  const v = raw.trim();
  if (v === "") return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}
