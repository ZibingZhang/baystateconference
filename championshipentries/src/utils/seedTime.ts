// A seed time is either `M:SS.hh` (single-digit minutes) or `S.hh` / `SS.hh` /
// `SSS.hh` (no minutes). The hundredths are optional (or partial) on entry and
// auto-completed to two digits, so `2:15`, `2:15.`, and `2:15.5` all become
// `2:15.50`; likewise `1` becomes `1.00`.
const MINUTE_SECONDS_RE = /^(\d):([0-5]\d)(?:\.(\d{0,2}))?$/;
const SECONDS_ONLY_RE = /^(\d{1,3})(?:\.(\d{0,2}))?$/;

/**
 * Normalize a user-typed seed time to `\d:\d{2}\.\d{2}` or `\d{1,3}\.\d{2}`,
 * completing the hundredths part if it was omitted or partial. Returns
 * undefined if the input doesn't match either shape (edit should be rejected).
 */
export function normalizeSeedTime(raw: string): string | undefined {
  const value = raw.trim();
  if (value === "") return "";

  const msMatch = value.match(MINUTE_SECONDS_RE);
  if (msMatch) {
    const [, minutes, seconds, hundredths] = msMatch;
    return `${minutes}:${seconds}.${(hundredths ?? "").padEnd(2, "0")}`;
  }

  const sMatch = value.match(SECONDS_ONLY_RE);
  if (sMatch) {
    const [, seconds, hundredths] = sMatch;
    return `${seconds}.${(hundredths ?? "").padEnd(2, "0")}`;
  }

  return undefined;
}

// A diving score isn't a time — there's no minutes/seconds/hundredths unit to
// it, just a decimal score with up to 3 whole-number digits. The decimal part
// is completed on entry (trailing zeros) if it's short, and rounded to 2
// digits if it's long, so `129` becomes `129.00`, `45` becomes `45.00`, and
// `129.996` becomes `130.00`.
const DIVE_SCORE_RE = /^(\d{1,3})(?:\.(\d*))?$/;

/**
 * Normalize a user-typed diving score to `\d{1,3}\.\d{2}`, completing the
 * decimal part if it was short or rounding it if it was long (carrying into
 * the whole part if that rounds up to 100). Returns undefined if the input
 * doesn't match that shape (edit should be rejected).
 */
export function normalizeDiveScore(raw: string): string | undefined {
  const value = raw.trim();
  if (value === "") return "";

  const match = value.match(DIVE_SCORE_RE);
  if (!match) return undefined;

  const [, whole, decimals] = match;
  if (!decimals) return `${whole}.00`;

  const hundredths = Math.round(Number(`0.${decimals}`) * 100);
  if (hundredths === 100) return `${Number(whole) + 1}.00`;
  return `${whole}.${String(hundredths).padStart(2, "0")}`;
}
